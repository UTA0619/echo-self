/**
 * future-self: On-demand future self simulation.
 *
 * Called by the mobile FutureSelfScreen when a user taps "Generate my future".
 * Generates a narrative vision + personal letter from the user's identity nodes,
 * memories, and emotional arc, then persists to future_self_simulations.
 *
 * POST body: { user_id: string, horizon_months: 1 | 3 | 12 | 36 }
 * Response:  { id, horizon_months, narrative, letter_text, trajectory_score, created_at }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-sonnet-4-6'

const HORIZON_LABELS: Record<number, string> = {
  1:  '1 month',
  3:  '3 months',
  12: '1 year',
  36: '3 years',
}

interface SimResult {
  narrative: string
  letter_text: string
  trajectory_score: number   // 1–10
}

async function generateSimulation(
  userName: string,
  horizonMonths: number,
  identityNodes: Array<{ type: string; label: string; description: string; confidence: number }>,
  recentEntries: Array<{ content: string; created_at: string }>,
  emotionArc: string,
): Promise<SimResult> {
  const horizon = HORIZON_LABELS[horizonMonths] ?? `${horizonMonths} months`

  const identityText = identityNodes
    .filter(n => n.confidence >= 0.5)
    .slice(0, 12)
    .map(n => `[${n.type}] ${n.label}: ${n.description}`)
    .join('\n')

  const entriesText = recentEntries
    .slice(0, 8)
    .map(e => `${new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${e.content.slice(0, 250)}`)
    .join('\n\n')

  const systemPrompt = `You are an expert behavioral psychologist and compassionate futurist.
You generate deeply personal, specific future-self simulations from someone's journal patterns and identity profile.
Never be generic. Reference their actual patterns, beliefs, and language.
Be honest — if the trajectory has risks, name them with compassion.`

  const userPrompt = `Create a ${horizon} future self simulation for ${userName}.

IDENTITY PROFILE:
${identityText || '(building identity model from entries)'}

EMOTIONAL ARC (recent trend): ${emotionArc}

RECENT JOURNAL ENTRIES:
${entriesText || '(no entries yet)'}

Generate two things:

1. NARRATIVE: A vivid, specific vision of who ${userName} is becoming in ${horizon}.
   - 300-400 words, present tense ("You are…")
   - Reference their actual patterns and beliefs by name
   - Include a trajectory_score (1–10) reflecting alignment between their current path and their stated aspirations

2. LETTER: A personal letter from their ${horizon}-future self to today's self.
   - 200-300 words, intimate and direct
   - Reveal 1 thing they've overcome, 1 gift they've grown into, 1 warning they wish they'd heeded
   - Written in first person as their future self

Return ONLY valid JSON:
{
  "narrative": "...",
  "letter_text": "Dear ${userName},\\n\\n...",
  "trajectory_score": 7.5
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json() as { content: Array<{ text: string }> }
  const raw = data.content[0]?.text ?? '{}'

  // Extract JSON even if wrapped in markdown code fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in Claude response')

  const parsed = JSON.parse(jsonMatch[0]) as SimResult
  return {
    narrative: parsed.narrative ?? '',
    letter_text: parsed.letter_text ?? '',
    trajectory_score: Math.min(10, Math.max(1, Number(parsed.trajectory_score) || 5)),
  }
}

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return errorResponse('Unauthorized', 401)

    const { user_id, horizon_months } = await req.json()

    if (!user_id) return errorResponse('user_id is required', 400)
    const horizonMonths = Number(horizon_months) || 12
    if (![1, 3, 12, 36].includes(horizonMonths)) {
      return errorResponse('horizon_months must be 1, 3, 12, or 36', 400)
    }

    const supabase = getServiceClient()

    // Verify the requesting user owns this user_id
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(
      auth.replace('Bearer ', ''),
    )
    if (authErr || !authUser) return errorResponse('Unauthorized', 401)

    // Fetch data in parallel
    const [nodesRes, entriesRes, profileRes] = await Promise.all([
      supabase
        .from('identity_nodes')
        .select('type, label, description, confidence')
        .eq('user_id', user_id)
        .eq('active', true)
        .order('confidence', { ascending: false })
        .limit(15),

      supabase
        .from('entries')
        .select('content, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('profiles')
        .select('display_name')
        .eq('auth_id', authUser.id)
        .maybeSingle(),
    ])

    // Build emotion arc from recent entries (fallback — emotion_history table preferred)
    const { data: emotionHistory } = await supabase
      .from('emotion_history')
      .select('date, avg_valence, dominant_emotion')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(7)

    const emotionArc = emotionHistory?.length
      ? emotionHistory.map(h => h.dominant_emotion ?? 'neutral').join(' → ')
      : 'building emotional baseline'

    const userName = profileRes.data?.display_name ?? 'you'

    const sim = await generateSimulation(
      userName,
      horizonMonths,
      nodesRes.data ?? [],
      entriesRes.data ?? [],
      emotionArc,
    )

    // Upsert to future_self_simulations (unique on user_id + horizon_months)
    const { data: upserted, error: upsertErr } = await supabase
      .from('future_self_simulations')
      .upsert(
        {
          user_id,
          horizon_months: horizonMonths,
          narrative: sim.narrative,
          letter_text: sim.letter_text,
          trajectory_score: sim.trajectory_score,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,horizon_months' },
      )
      .select()
      .single()

    if (upsertErr) {
      console.error('[future-self] upsert error:', upsertErr)
      return errorResponse('Failed to save simulation', 500)
    }

    return jsonResponse(upserted)
  } catch (err) {
    console.error('[future-self] Error:', err)
    return errorResponse('Internal error', 500)
  }
})
