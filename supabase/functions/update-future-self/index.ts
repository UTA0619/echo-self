/**
 * update-future-self — Nightly future-self simulation batch job.
 * Cron: 0 3 * * * (3am UTC)
 *
 * For each Premium user with ≥ 20 memories:
 *   1. Fetch identity nodes + recent memories + emotion trajectory
 *   2. Ask Claude Sonnet to generate a narrative, letter, and trajectory score
 *      for 3 time horizons (1 month / 3 months / 12 months)
 *   3. Upsert into future_self_simulations (UNIQUE on user_id, horizon_months)
 *
 * Auth: Bearer <CRON_SECRET> header (set in Supabase Cron dashboard)
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const CRON_SECRET       = Deno.env.get('CRON_SECRET')!

// horizon_months values and their human-readable labels
const HORIZONS: Array<{ months: 1 | 3 | 12; label: string }> = [
  { months: 1,  label: '1 month'  },
  { months: 3,  label: '3 months' },
  { months: 12, label: '1 year'   },
]

// ── Claude Sonnet call ────────────────────────────────────────────────────────

interface SimulationOutput {
  narrative:        string  // 3–4 sentence trajectory narrative
  letter_text:      string  // direct letter from future self
  trajectory_score: number  // 0–100, overall growth score
}

async function generateSimulation(
  userName: string,
  horizon: { months: number; label: string },
  identityNodes: Array<{ type: string; label: string; confidence: number }>,
  recentMemories: string[],
  emotionArc: string,
): Promise<SimulationOutput | null> {
  const nodesText = identityNodes
    .filter(n => n.confidence >= 0.5)
    .slice(0, 12)
    .map(n => `- [${n.type}] ${n.label} (confidence ${Math.round(n.confidence * 100)}%)`)
    .join('\n')

  const memoriesText = recentMemories
    .slice(0, 10)
    .map((m, i) => `${i + 1}. ${m}`)
    .join('\n')

  const systemPrompt = `You are ECHO's Future Self engine — a compassionate, honest AI that synthesizes a person's behavioral identity into vivid, specific future projections.

You are NOT a therapist. You do NOT make medical claims.
Be specific and personal — never generic. Reference actual patterns from the data.
Be honest: if the trajectory has risks, name them compassionately.

Always respond with valid JSON only. No markdown, no preamble.`

  const userPrompt = `User: ${userName}
Time horizon: ${horizon.label} from now

Identity nodes (inferred from journaling patterns):
${nodesText || 'No confirmed identity nodes yet.'}

Emotional trajectory (recent 7 days, newest first):
${emotionArc || 'insufficient data'}

Recent memory excerpts:
${memoriesText || 'No recent memories.'}

Generate a future-self simulation for ${horizon.label} from now.

Return JSON with exactly these keys:
{
  "narrative": "3-4 sentences describing who ${userName} will likely be in ${horizon.label}. Start each sentence on a new line. Be vivid and specific.",
  "letter_text": "A 4-6 sentence letter written by ${userName}'s future self (${horizon.label} from now) to their present self. Start with 'Dear ${userName}'. Be warm, honest, and specific to their patterns.",
  "trajectory_score": <integer 0-100 representing overall growth trajectory where 50 = steady state, >50 = growing, <50 = risk of decline>
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 900,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    console.error(`[update-future-self] Claude error ${res.status}:`, await res.text())
    return null
  }

  const data = await res.json() as { content: Array<{ text: string }> }
  const raw  = data.content[0]?.text ?? ''

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('no JSON found')
    const parsed = JSON.parse(jsonMatch[0]) as SimulationOutput
    return {
      narrative:        parsed.narrative ?? '',
      letter_text:      parsed.letter_text ?? '',
      trajectory_score: Math.min(100, Math.max(0, Math.round(parsed.trajectory_score ?? 50))),
    }
  } catch (err) {
    console.error('[update-future-self] JSON parse failed:', err, '\nRaw:', raw.slice(0, 200))
    return null
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = getServiceClient()
  const start    = Date.now()
  let processed  = 0
  let skipped    = 0

  try {
    // 1. Get eligible users (Premium + ≥ 20 memories)
    const { data: eligibleUsers, error: eligErr } = await supabase
      .rpc('get_users_for_prediction')

    if (eligErr) throw eligErr
    if (!eligibleUsers?.length) {
      return Response.json({ ok: true, processed: 0, message: 'No eligible users' })
    }

    const userIds: string[] = eligibleUsers.map((u: { user_id: string }) => u.user_id)

    for (const userId of userIds) {
      try {
        // Fetch in parallel
        const [nodesRes, memoriesRes, profileRes, emotionRes] = await Promise.all([
          supabase
            .from('identity_nodes')
            .select('type, label, confidence')
            .eq('user_id', userId)
            .eq('active', true)
            .order('confidence', { ascending: false })
            .limit(15),

          supabase
            .from('memories')
            .select('content_chunk')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(12),

          supabase
            .from('profiles')
            .select('display_name')
            .eq('auth_id', userId)
            .maybeSingle(),

          supabase
            .from('emotion_history_7d')
            .select('dominant_emotion')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(7),
        ])

        const identityNodes  = nodesRes.data ?? []
        const recentMemories = (memoriesRes.data ?? []).map((m: { content_chunk: string }) => m.content_chunk)
        const userName       = profileRes.data?.display_name ?? 'you'
        const emotionArc     = (emotionRes.data ?? [])
          .map((r: { dominant_emotion: string }) => r.dominant_emotion)
          .filter(Boolean)
          .join(' → ')

        if (recentMemories.length < 5) {
          skipped++
          continue
        }

        // 2. Generate simulations for each horizon
        for (const horizon of HORIZONS) {
          const simulation = await generateSimulation(
            userName, horizon, identityNodes, recentMemories, emotionArc,
          )

          if (!simulation) continue

          await supabase
            .from('future_self_simulations')
            .upsert({
              user_id:          userId,
              horizon_months:   horizon.months,
              narrative:        simulation.narrative,
              letter_text:      simulation.letter_text,
              trajectory_score: simulation.trajectory_score,
            }, { onConflict: 'user_id,horizon_months' })
        }

        processed++

        // Rate-limit: 500ms between users to avoid Claude rate limits
        await new Promise((r) => setTimeout(r, 500))

      } catch (userErr) {
        console.error(JSON.stringify({
          msg:   'prediction_user_error',
          userId,
          error: userErr instanceof Error ? userErr.message : String(userErr),
        }))
        skipped++
      }
    }

    console.log(JSON.stringify({
      msg: 'update_future_self_complete',
      processed,
      skipped,
      ms: Date.now() - start,
    }))

    return Response.json({ ok: true, processed, skipped, ms: Date.now() - start })

  } catch (err) {
    console.error(JSON.stringify({
      msg:   'update_future_self_fatal',
      error: String(err),
      ms:    Date.now() - start,
    }))
    return new Response('Internal error', { status: 500 })
  }
})
