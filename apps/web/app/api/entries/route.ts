import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countTodayEntries } from '@/lib/entries.server'
import { getSubscriptionStatus } from '@/lib/subscription-server'
import { FREE_LIMITS } from '@/lib/subscription'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Free tier enforcement ─────────────────────────────────────────────────
  const [subscription, todayCount] = await Promise.all([
    getSubscriptionStatus(),
    countTodayEntries(),
  ])

  if (!subscription.isPremium && todayCount >= FREE_LIMITS.entriesPerDay) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        message: `Free plan allows ${FREE_LIMITS.entriesPerDay} entries per day. Upgrade to Pro for unlimited entries.`,
        todayCount,
        limit: FREE_LIMITS.entriesPerDay,
      },
      { status: 403 },
    )
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content || content.length < 10) {
    return NextResponse.json({ error: 'Content too short' }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 })
  }

  // ── Insert entry ──────────────────────────────────────────────────────────
  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({ user_id: user.id, content })
    .select()
    .single()

  if (insertError || !entry) {
    console.error('[entries/POST] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
  }

  // ── Trigger echo-ai edge function asynchronously (fire-and-forget) ────────
  // We don't await this — the AI response arrives via Supabase Realtime.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceKey) {
    fetch(`${supabaseUrl}/functions/v1/echo-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ entry_id: entry.id, user_id: user.id }),
    }).catch((err) => console.error('[echo-ai trigger]', err))
  } else {
    console.warn('[entries/POST] SUPABASE_SERVICE_ROLE_KEY not set — AI pipeline skipped')
  }

  return NextResponse.json(entry, { status: 201 })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100)

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
