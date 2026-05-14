// ECHO//SELF — Edge Function: update-future-self
// Cron: 0 3 * * * (3am UTC daily)
// Generates 30/90/365 day future self predictions from identity nodes + recent memories.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

interface FutureSelfPrediction {
  timeframe: '30d' | '90d' | '365d'
  headline: string
  narrative: string
  opportunity: string
  risk: string
  confidence: number
  share_snippet: string
}

async function generatePredictions(
  identityNodes: Array<{ type: string; label: string; confidence: number }>,
  recentMemories: string[],
  emotionTrajectory: string,
  userName: string
): Promise<FutureSelfPrediction[]> {
  const nodesText = identityNodes
    .filter(n => n.confidence > 0.6)
    .map(n => `- ${n.type}: ${n.label} (confidence: ${n.confidence.toFixed(1)})`)
    .join('\n')

  const memoriesText = recentMemories.slice(0, 10).map(m => `- ${m}`).join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1200,
    temperature: 0.8,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `You are a behavioral psychologist generating future self predictions for ${userName}.
Be specific and reference their actual patterns. Be honest — if the trajectory is concerning, say so with compassion.
Never be generic. Every prediction should feel written specifically for this person.`,
    }, {
      role: 'user',
      content: `Identity nodes:
${nodesText}

Recent emotional trajectory: ${emotionTrajectory}

Recent memories:
${memoriesText}

Generate predictions for 30d, 90d, and 365d timeframes.
Return valid JSON:
{
  "predictions": [
    {
      "timeframe": "30d",
      "headline": "1 bold sentence starting with 'In 30 days...'",
      "narrative": "2-3 sentences expanding the prediction. Reference specific patterns.",
      "opportunity": "1 sentence: what they could do to improve this trajectory",
      "risk": "1 sentence: what could derail this trajectory",
      "confidence": 0.0-1.0,
      "share_snippet": "1 sentence safe to share publicly (no personal details)"
    },
    { "timeframe": "90d", ... },
    { "timeframe": "365d", ... }
  ]
}`,
    }],
  })

  try {
    const parsed = JSON.parse(response.choices[0].message.content!)
    return parsed.predictions ?? []
  } catch {
    return []
  }
}

serve(async (req) => {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  let processed = 0
  let skipped = 0

  try {
    // Get Pro users with enough data for predictions (≥ 20 memories)
    const { data: eligibleUsers } = await supabase.rpc('get_users_for_prediction')

    if (!eligibleUsers?.length) {
      return Response.json({ ok: true, processed: 0, message: 'No eligible users' })
    }

    for (const userId of eligibleUsers.map((u: any) => u.user_id)) {
      try {
        // Fetch identity nodes
        const { data: identityNodes } = await supabase
          .from('identity_nodes')
          .select('type, label, confidence')
          .eq('user_id', userId)
          .eq('active', true)
          .order('confidence', { ascending: false })
          .limit(15)

        if (!identityNodes?.length) { skipped++; continue }

        // Fetch recent memories
        const { data: memories } = await supabase
          .from('memories')
          .select('content')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(15)

        // Fetch profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single()

        // Get recent emotional trajectory
        const { data: recentEntries } = await supabase
          .from('journal_entries')
          .select('emotions')
          .eq('user_id', userId)
          .eq('ai_processed', true)
          .order('created_at', { ascending: false })
          .limit(5)

        const emotionSummary = recentEntries
          ?.map((e: any) => e.emotions?.primary?.emotion)
          .filter(Boolean)
          .join(', ') ?? 'mixed'

        const predictions = await generatePredictions(
          identityNodes ?? [],
          memories?.map(m => m.content) ?? [],
          emotionSummary,
          profile?.display_name ?? 'this person'
        )

        // Upsert predictions
        for (const pred of predictions) {
          await supabase.from('future_self_predictions').upsert({
            user_id: userId,
            timeframe: pred.timeframe,
            headline: pred.headline,
            narrative: pred.narrative,
            opportunity: pred.opportunity,
            risk: pred.risk,
            confidence: pred.confidence,
            share_snippet: pred.share_snippet,
            generated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,timeframe' })
        }

        processed++

        // Rate limit pause between users
        await new Promise(r => setTimeout(r, 500))

      } catch (err) {
        console.error(JSON.stringify({
          msg: 'prediction_error',
          userId,
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    }

    console.log(JSON.stringify({ msg: 'predictions_complete', processed, skipped, ms: Date.now() - start }))
    return Response.json({ ok: true, processed, skipped })

  } catch (err) {
    console.error(JSON.stringify({ msg: 'prediction_fatal', error: String(err), ms: Date.now() - start }))
    return new Response('Internal error', { status: 500 })
  }
})
