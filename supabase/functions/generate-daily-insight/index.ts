// ECHO//SELF — Edge Function: generate-daily-insight
// Cron: 0 8 * * * (8am UTC daily)
// Generates a personalized insight for each active user from their recent memories,
// then triggers a push notification.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')!
const ONESIGNAL_APP_ID = Deno.env.get('NEXT_PUBLIC_ONESIGNAL_APP_ID')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

async function generateInsight(memories: string[], userName: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.85,
    messages: [{
      role: 'system',
      content: `You generate short, personalized daily insights for ${userName} based on their recent journal memories.
Be specific, direct, and use their actual patterns. Never give generic advice.
The insight should feel like it was written just for them. Max 2 sentences.`,
    }, {
      role: 'user',
      content: `Recent memories:\n${memories.slice(0, 8).map(m => `- ${m}`).join('\n')}\n\nGenerate one insight.`,
    }],
  })

  return response.choices[0].message.content?.trim() ?? ''
}

async function sendPushNotification(playerId: string, title: string, body: string): Promise<void> {
  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: body },
      data: { type: 'daily_insight', deep_link: '/echo' },
    }),
  })
}

serve(async (req) => {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  let processed = 0
  let errors = 0

  try {
    // Get active users with push notifications enabled who have recent memories
    const { data: activeUsers } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        onesignal_player_id,
        insight_ready,
        profiles!inner (display_name),
        subscriptions!inner (plan, status)
      `)
      .eq('insight_ready', true)
      .not('onesignal_player_id', 'is', null)
      .in('subscriptions.status', ['active', 'trialing'])

    if (!activeUsers?.length) {
      return Response.json({ ok: true, processed: 0, message: 'No active users' })
    }

    // Process in batches of 10 to avoid OpenAI rate limits
    for (let i = 0; i < activeUsers.length; i += 10) {
      const batch = activeUsers.slice(i, i + 10)

      await Promise.allSettled(batch.map(async (user) => {
        try {
          // Get recent memories (last 7 days)
          const { data: memories } = await supabase
            .from('memories')
            .select('content')
            .eq('user_id', user.user_id)
            .eq('is_archived', false)
            .gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(10)

          if (!memories?.length) return  // Not enough data yet

          const memoryTexts = memories.map(m => m.content)
          const userName = (user.profiles as any)?.display_name ?? 'You'
          const insight = await generateInsight(memoryTexts, userName)

          if (!insight) return

          // Store insight
          await supabase.from('journal_entries').insert({
            user_id: user.user_id,
            content: insight,
            content_type: 'echo_session',
            title: 'Daily Insight',
            ai_processed: true,
          })

          // Send push notification
          await sendPushNotification(
            user.onesignal_player_id!,
            'Your Echo noticed something',
            insight.length > 40 ? insight.slice(0, 37) + '...' : insight
          )

          processed++
        } catch (err) {
          console.error(JSON.stringify({
            msg: 'user_insight_error',
            userId: user.user_id,
            error: err instanceof Error ? err.message : String(err),
          }))
          errors++
        }
      }))

      // Brief pause between batches (rate limiting)
      if (i + 10 < activeUsers.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    console.log(JSON.stringify({
      msg: 'daily_insight_complete',
      processed,
      errors,
      ms: Date.now() - start,
    }))

    return Response.json({ ok: true, processed, errors })

  } catch (err) {
    console.error(JSON.stringify({
      msg: 'daily_insight_fatal_error',
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    }))
    return new Response('Internal error', { status: 500 })
  }
})
