import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const CRON_SECRET = Deno.env.get('CRON_SECRET')

// ECHO//SELF — Cron: send daily streak reminders
// Schedule: 0 12 * * *  (noon UTC — covers evening in most timezones)
// Sends Expo push notifications to users who haven't written today.

interface NotificationRecord {
  user_id: string
  push_token: string | null
  platform: string | null
}

async function sendExpoPush(tokens: string[], title: string, body: string): Promise<void> {
  if (!tokens.length) return

  const messages = tokens.map((token) => ({
    to:    token,
    title,
    body,
    sound: 'default',
    badge: 1,
    data:  { screen: 'DailyMirror' },
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(messages),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[send-streak-reminders] Expo push error:', text)
  }
}

serve(async (req: Request) => {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('x-cron-secret')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]! // YYYY-MM-DD UTC

  try {
    // Find users who:
    // 1. Have notifications enabled + a push token
    // 2. Have NOT written an entry today
    const { data: candidates, error } = await supabase
      .from('notifications')
      .select('user_id, push_token, platform')
      .not('push_token', 'is', null)

    if (error) throw error
    if (!candidates?.length) {
      return Response.json({ sent: 0, skipped: 0, message: 'No push tokens registered' })
    }

    // Get users who already wrote today
    const userIds = candidates.map((c: NotificationRecord) => c.user_id)
    const { data: wroteToday } = await supabase
      .from('journal_entries')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)

    const wroteSet = new Set((wroteToday ?? []).map((e: { user_id: string }) => e.user_id))

    // Filter to users who need a nudge
    const tokensToNotify = (candidates as NotificationRecord[])
      .filter((c) => !wroteSet.has(c.user_id) && c.push_token)
      .map((c) => c.push_token!)

    if (!tokensToNotify.length) {
      return Response.json({ sent: 0, skipped: candidates.length, message: 'All users already wrote today' })
    }

    const MESSAGES = [
      { title: 'Echo is listening ✦', body: "What's on your mind today? Take 5 minutes to reflect." },
      { title: 'Your streak is waiting 🔥', body: 'Just one entry keeps the momentum going.' },
      { title: 'Time to check in ◈', body: 'Echo has been thinking about you. Tell it how your day went.' },
    ]

    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!
    await sendExpoPush(tokensToNotify, msg.title, msg.body)

    console.log(JSON.stringify({
      msg: 'streak_reminders_sent',
      sent: tokensToNotify.length,
      skipped: wroteSet.size,
      date: today,
    }))

    return Response.json({
      sent:    tokensToNotify.length,
      skipped: wroteSet.size,
      success: true,
    })
  } catch (err) {
    console.error('[send-streak-reminders] Error:', err)
    return new Response('Internal server error', { status: 500 })
  }
})
