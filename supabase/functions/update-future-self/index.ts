import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/cors.ts'

const OPENAI_API_KEY   = Deno.env.get('OPENAI_API_KEY')!
const CRON_SECRET      = Deno.env.get('CRON_SECRET')

// Minimum memories required before generating a prediction
const MIN_MEMORIES = 20

// Timeframes to generate
const TIMEFRAMES = ['30d', '90d', '365d'] as const
type Timeframe = typeof TIMEFRAMES[number]

interface TraitShift {
  trait: string
  from: string
  to: string
  direction: 'growth' | 'healing' | 'transformation' | 'integration'
  magnitude: number
}

interface PredictionResult {
  personaName: string
  description: string
  keyTraitShifts: TraitShift[]
  confidenceScore: number
  visualArchetype: string
  shareSnippet: string
}

async function generatePrediction(
  memories: Array<{ content_chunk: string; emotion: string | null; importance_score: number }>,
  timeframe: Timeframe,
): Promise<PredictionResult> {
  const horizon = timeframe === '30d' ? '30 days' : timeframe === '90d' ? '90 days' : '1 year'
  const memoryContext = memories
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 60)
    .map((m) => `[${m.emotion ?? 'neutral'}] ${m.content_chunk}`)
    .join('\n\n')

  const systemPrompt = `You are Echo, an AI identity analyst who deeply understands human psychology and growth patterns.
Analyze the user's journal memory fragments and predict who they will become in ${horizon}.
Focus on authentic patterns, not flattery. Be precise and emotionally intelligent.`

  const userPrompt = `Based on these memory fragments from the user's journal:

${memoryContext}

Generate a future self prediction for ${horizon} from now. Return valid JSON with this exact structure:
{
  "personaName": "short evocative name for their future self (e.g. 'The Grounded Visionary')",
  "description": "2-3 sentence portrait of who they're becoming",
  "keyTraitShifts": [
    {
      "trait": "trait name",
      "from": "current state description",
      "to": "future state description",
      "direction": "growth|healing|transformation|integration",
      "magnitude": 0.0-1.0
    }
  ],
  "confidenceScore": 0.0-1.0,
  "visualArchetype": "one of: visionary|healer|creator|rebel|sage|explorer|guardian|alchemist",
  "shareSnippet": "one poetic sentence about their transformation for sharing"
}
Return only the JSON object, no markdown.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status} ${await response.text()}`)
  }

  const result = await response.json() as { choices: Array<{ message: { content: string } }> }
  const content = result.choices[0]!.message.content
  return JSON.parse(content) as PredictionResult
}

serve(async (req: Request) => {
  // Accept both cron invocations (GET with secret header) and direct POST calls
  const authHeader = req.headers.get('authorization') ?? req.headers.get('x-cron-secret')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = getServiceClient()

  try {
    // Get all premium users who have enough memories
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('subscription_tier', 'premium')

    if (usersError) throw usersError
    if (!users?.length) return jsonResponse({ processed: 0, message: 'No premium users' })

    let processed = 0
    let errors = 0

    for (const user of users) {
      try {
        // Count user's memories
        const { count } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if ((count ?? 0) < MIN_MEMORIES) continue

        // Fetch top memories by importance
        const { data: memories, error: memError } = await supabase
          .from('memories')
          .select('content_chunk, emotion, importance_score')
          .eq('user_id', user.id)
          .order('importance_score', { ascending: false })
          .limit(80)

        if (memError || !memories?.length) continue

        // Generate predictions for all 3 timeframes in parallel
        const predictions = await Promise.allSettled(
          TIMEFRAMES.map((tf) => generatePrediction(memories, tf)),
        )

        // Upsert each successful prediction
        for (let i = 0; i < TIMEFRAMES.length; i++) {
          const tf = TIMEFRAMES[i]!
          const result = predictions[i]!
          if (result.status !== 'fulfilled') {
            console.error(`[update-future-self] prediction failed user=${user.id} tf=${tf}:`, result.reason)
            errors++
            continue
          }

          const pred = result.value
          await supabase.from('future_self_predictions').upsert(
            {
              user_id:          user.id,
              time_horizon:     tf,
              persona_name:     pred.personaName,
              description:      pred.description,
              key_trait_shifts: pred.keyTraitShifts,
              confidence_score: pred.confidenceScore,
              visual_archetype: pred.visualArchetype,
              share_snippet:    pred.shareSnippet,
              generated_at:     new Date().toISOString(),
              entry_count:      count ?? 0,
            },
            { onConflict: 'user_id,time_horizon' },
          )
        }

        processed++
      } catch (userErr) {
        console.error(`[update-future-self] Error for user ${user.id}:`, userErr)
        errors++
      }
    }

    return jsonResponse({
      processed,
      errors,
      total_users: users.length,
      success: true,
    })
  } catch (err) {
    console.error('[update-future-self] Fatal error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
