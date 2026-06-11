/**
 * generate-daily-insight — Personalized AI insight push notification
 *
 * Cron: 0 9 * * * (9am UTC daily) — sends after morning has started globally.
 *
 * For each active user who:
 *  a) has at least 3 memories, and
 *  b) has not received an insight in the last 23 hours, and
 *  c) has at least one Expo push token
 *
 * It generates a short, personalized insight via Claude Haiku
 * and delivers it via the Expo Push API.
 *
 * POST /generate-daily-insight  (cron-secret protected)
 * Body (optional): { user_id?: string }  — single-user override for testing
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { buildDailyInsightPrompt, buildDailyInsightSystemPrompt } from '../_shared/prompts/daily-insight.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CRON_SECRET       = Deno.env.get('CRON_SECRET')!
const EXPO_PUSH_URL     = 'https://exp.host/--/api/v2/push/send'

// ── Expo push ─────────────────────────────────────────────────────────────────

async function sendExpoPush(tokens: string[], title: string, body: string): Promise<void> {
  if (!tokens.length) return

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { type: 'daily_insight' },
  }))

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    console.error('[insight] Expo push error:', await res.text())
  }
}

// ── Insight generation ────────────────────────────────────────────────────────

async function generateInsight(
  userName: string,
  recentMemories: string[],
  emotionArc: string,
  topTags: string[],
  streakDays: number,
): Promise<{ insight: string; push_title: string }> {
  const userPrompt = buildDailyInsightPrompt({
    userName,
    recentMemories,
    emotionArc,
    topTags,
    streakDays,
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: buildDailyInsightSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json() as { content: Array<{ text: string }> }
  const raw  = data.content[0]?.text ?? '{}'

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { insight: string; push_title: string }
      return { insight: parsed.insight ?? raw, push_title: parsed.push_title ?? 'ECHO' }
    }
  } catch { /* ignore */ }

  return { insight: raw.trim().slice(0, 160), push_title: 'ECHO' }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Auth: cron-secret header OR bearer token
  const cronHeader = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  const authorized =
    cronHeader === CRON_SECRET ||
    authHeader === `Bearer ${CRON_SECRET}`

  if (!authorized) return new Response('Unauthorized', { status: 401 })

  const supabase = getServiceClient()
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const singleUserId: string | null = body.user_id ?? null

  const since23h = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  let processed = 0
  let skipped   = 0

  try {
    // 1. Find eligible users (have push tokens, not deleted)
    let query = supabase
      .from('users')
      .select(`
        id,
        display_name,
        current_streak,
        push_tokens!inner ( expo_push_token )
      `)
      .is('deleted_at', null)

    if (singleUserId) {
      query = query.eq('id', singleUserId)
    }

    const { data: users, error } = await query
    if (error) throw error

    for (const user of (users ?? [])) {
      try {
        const tokens: string[] = (user.push_tokens as Array<{ expo_push_token: string }>)
          .map((t) => t.expo_push_token)
          .filter(Boolean)

        if (!tokens.length) { skipped++; continue }

        // De-duplicate: skip if insight already sent within 23 hours
        const { data: lastInsight } = await supabase
          .from('notifications')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('type', 'daily_insight')
          .gte('created_at', since23h)
          .maybeSingle()

        if (lastInsight && !singleUserId) { skipped++; continue }

        // Fetch context
        const [memoriesRes, tagsRes] = await Promise.all([
          supabase
            .from('memories')
            .select('content_chunk')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('entry_behavioral_tags')
            .select('tags')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        const recentMemories = memoriesRes.data?.map(m => m.content_chunk) ?? []
        if (recentMemories.length < 3) { skipped++; continue }

        // Build emotion arc from the emotion_history_7d view
        const { data: emotionRows } = await supabase
          .from('emotion_history_7d')
          .select('dominant_emotion')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5)

        const emotionArc = emotionRows
          ?.map(r => r.dominant_emotion)
          .filter(Boolean)
          .join(' → ') ?? 'mixed'

        // Aggregate top tags from recent entries
        const tagFreq: Record<string, number> = {}
        tagsRes.data?.forEach(row => {
          (row.tags as string[] ?? []).forEach(t => {
            tagFreq[t] = (tagFreq[t] ?? 0) + 1
          })
        })
        const topTags = Object.entries(tagFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t)

        // Generate insight and push
        const { insight, push_title } = await generateInsight(
          user.display_name ?? 'you',
          recentMemories,
          emotionArc,
          topTags,
          user.current_streak ?? 0,
        )

        await sendExpoPush(tokens, push_title, insight)

        // Log to notifications table
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'daily_insight',
          title: push_title,
          body: insight,
        })

        processed++

        // Rate-limit: 300ms between users
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error('[insight] user error:', user.id, err)
        skipped++
      }
    }

    console.log(JSON.stringify({ msg: 'daily_insight_complete', processed, skipped }))
    return Response.json({ ok: true, processed, skipped })
  } catch (err) {
    console.error('[insight] fatal:', err)
    return new Response('Internal error', { status: 500 })
  }
})
