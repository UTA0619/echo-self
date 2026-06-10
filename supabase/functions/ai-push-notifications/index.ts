/**
 * ai-push-notifications — Personalized AI-driven push notifications
 *
 * Cron endpoint (runs daily at 09:00 UTC). For each active user who
 * hasn't journaled today, it:
 *  1. Loads recent emotion arc from emotion_history_7d view
 *  2. Generates a personalized, empathetic notification body via Claude Haiku
 *  3. Sends via Expo Push API in batches of 100
 *
 * The notification body references the user's emotional patterns to feel
 * personal rather than generic ("You've been feeling anticipation lately…").
 *
 * POST /ai-push-notifications  — requires x-cron-secret header
 */

import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CRON_SECRET       = Deno.env.get('CRON_SECRET')!
const EXPO_PUSH_URL     = 'https://exp.host/--/api/v2/push/send'

// ── Claude Haiku call ─────────────────────────────────────────────────────────

async function generatePushCopy(
  displayName: string,
  emotionSummary: string,
  streakCount: number,
): Promise<{ title: string; body: string }> {
  const streakHint = streakCount > 1
    ? `They have a ${streakCount}-day streak at risk.`
    : 'No active streak.'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: `You write short, warm, non-judgmental push notification copy for a journaling app called ECHO.
ECHO helps users understand their emotions and build self-knowledge through AI.
Write a title (max 40 chars) and body (max 90 chars) that feels personal and empathetic.
Never be preachy. Reference the user's recent emotional patterns naturally if available.
Output ONLY valid JSON: {"title": "...", "body": "..."}`,
      messages: [{
        role:    'user',
        content: `User name: ${displayName}\nEmotional context: ${emotionSummary}\n${streakHint}\nGenerate a personalized push notification.`,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Claude error: ${res.status}`)

  const json = await res.json() as { content: Array<{ text: string }> }
  const text = json.content?.[0]?.text ?? '{}'

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')

  const parsed = JSON.parse(match[0]) as { title?: string; body?: string }
  return {
    title: parsed.title ?? 'Your reflection is waiting ✨',
    body:  parsed.body  ?? 'Take a moment to check in with yourself today.',
  }
}

// ── Expo push helper ──────────────────────────────────────────────────────────

async function sendExpoBatch(payloads: unknown[]): Promise<{ sent: number; failed: number }> {
  let sent   = 0
  let failed = 0

  const BATCH_SIZE = 100
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE)
    try {
      const res    = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(batch),
      })
      const result = await res.json() as { data?: Array<{ status: string }> }
      const errs   = result.data?.filter(r => r.status === 'error') ?? []
      sent   += batch.length - errs.length
      failed += errs.length
      if (errs.length) console.warn(`[ai-push] ${errs.length} push errors in batch ${Math.floor(i / BATCH_SIZE) + 1}`)
    } catch (err) {
      console.error(`[ai-push] Expo batch failed:`, err)
      failed += batch.length
    }
  }

  return { sent, failed }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const secret = req.headers.get('Authorization')?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret')
  if (secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 })

  const supabase = getServiceClient()
  const today    = new Date().toISOString().slice(0, 10)
  const since23h = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()

  console.log('[ai-push] Starting personalized notification run…')

  // ── 1. Find users with push tokens who haven't received an insight notification
  //       within 23 hours (de-dup with generate-daily-insight)
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      display_name,
      current_streak,
      push_tokens!inner ( expo_push_token )
    `)
    .is('deleted_at', null)
    .limit(500)

  if (error) {
    console.error('[ai-push] users query error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!users?.length) {
    console.log('[ai-push] No users with push tokens')
    return Response.json({ sent: 0, failed: 0, users: 0 })
  }

  // Filter: skip users who already got an insight today or journaled today
  const eligibleUsers = await Promise.all(
    users.map(async (user) => {
      // Already notified?
      const { data: recentNote } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('user_id', user.id)
        .in('type', ['daily_insight', 'ai_push'])
        .gte('created_at', since23h)
        .maybeSingle()

      if (recentNote) return null   // already sent

      // Already journaled today?
      const { data: todayEntry } = await supabase
        .from('entries')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00Z`)
        .maybeSingle()

      if (todayEntry) return null   // journaled today, skip

      return user
    })
  )

  const eligible = eligibleUsers.filter(Boolean) as typeof users
  console.log(`[ai-push] ${eligible.length}/${users.length} users eligible after de-dup`)

  if (!eligible.length) return Response.json({ sent: 0, failed: 0, users: 0 })

  // ── 2. Build emotion context + generate Claude copy for each user
  const pushPayloads: unknown[] = []

  for (const user of eligible) {
    const tokens: string[] = (user.push_tokens as Array<{ expo_push_token: string }>)
      .map(t => t.expo_push_token).filter(Boolean)

    if (!tokens.length) continue

    // Fetch emotion arc from view
    const { data: emotionRows } = await supabase
      .from('emotion_history_7d')
      .select('dominant_emotion')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5)

    const topEmotions = emotionRows
      ?.map(r => r.dominant_emotion)
      .filter(Boolean) ?? []

    const emotionSummary = topEmotions.length > 0
      ? `Recent emotions: ${topEmotions.join(' → ')}.`
      : 'No recent emotion data available.'

    let title: string
    let body: string

    try {
      const copy = await generatePushCopy(
        user.display_name ?? 'there',
        emotionSummary,
        user.current_streak ?? 0,
      )
      title = copy.title
      body  = copy.body
    } catch (err) {
      console.error(`[ai-push] Claude error for user ${user.id}:`, err)
      // Fallback copy
      const streak = user.current_streak ?? 0
      title = streak > 1 ? `${streak}-day streak 🔥` : 'Your echo is waiting ✨'
      body  = 'Take a moment to reflect — your future self will thank you.'
    }

    // Log to notifications for de-dup
    await supabase.from('notifications').insert({
      user_id: user.id,
      type:    'ai_push',
      title,
      body,
    }).then(({ error: e }) => {
      if (e) console.warn('[ai-push] notification log error:', e.message)
    })

    tokens.forEach(token => {
      pushPayloads.push({ to: token, title, body, data: { screen: 'Mirror' }, sound: 'default', badge: 1 })
    })

    // Rate-limit: 200ms between users
    await new Promise(r => setTimeout(r, 200))
  }

  // ── 3. Send to Expo in batches
  const { sent, failed } = await sendExpoBatch(pushPayloads)
  console.log(JSON.stringify({ msg: 'ai_push_complete', sent, failed, eligible: eligible.length }))

  return Response.json({ sent, failed, users: eligible.length })
})
