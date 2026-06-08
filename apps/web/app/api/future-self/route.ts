import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

type Timeframe = '30d' | '90d' | '1yr'

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-large', input: text, dimensions: 3072 }),
  })
  const json = await res.json() as { data: Array<{ embedding: number[] }> }
  return json.data[0]!.embedding
}

async function callClaude(prompt: string, system: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const json = await res.json() as { content: Array<{ text: string }> }
  return json.content[0]?.text ?? ''
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { timeframe = '90d' } = await req.json() as { timeframe?: Timeframe }

  Sentry.setUser({ id: user.id })
  Sentry.setTag('timeframe', timeframe)

  try {
    return await runFutureSelf(supabase, user, timeframe)
  } catch (err) {
    Sentry.captureException(err)
    console.error('future-self error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

async function runFutureSelf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  timeframe: Timeframe,
): Promise<NextResponse> {
  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarding_data')
    .eq('auth_id', user.id)
    .single()

  const userName = profile?.display_name ?? 'you'
  const onboardingData = (profile?.onboarding_data as Record<string, unknown>) ?? {}
  const identityTags: string[] = (onboardingData.identityTags as string[]) ?? []
  const aspirations: string = (onboardingData.aspirations as string) ?? ''

  // Fetch recent emotion arc
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: recentEntries } = await supabase
    .from('entries')
    .select('content, emotion, emotion_score, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since30d)
    .order('created_at', { ascending: false })
    .limit(30)

  const emotionCounts = (recentEntries ?? []).reduce<Record<string, number>>((acc, e) => {
    if (e.emotion) acc[e.emotion] = (acc[e.emotion] ?? 0) + 1
    return acc
  }, {})
  const emotionalArcSummary = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([e, c]) => `${e} (${c}x)`)
    .join(', ') || 'neutral'

  // Semantic retrieval of most significant memories
  const queryEmbedding = await generateEmbedding(
    `${identityTags.join(', ')} ${aspirations} ${emotionalArcSummary}`
  )

  const { data: memories } = await supabase.rpc('search_entries', {
    p_user_id: user.id,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: 8,
  }).catch(() => ({ data: null }))

  const topMemories = (memories ?? (recentEntries ?? []).slice(0, 8))
    .map((m: Record<string, unknown>) => ({
      contentChunk: String(m.content ?? '').slice(0, 300),
      emotion: (m.emotion as string | null) ?? null,
      importanceScore: Number(m.similarity ?? m.emotion_score ?? 0.5),
    }))

  const timeframeLabel: Record<Timeframe, string> = { '30d': '30 days', '90d': '90 days', '1yr': '1 year' }

  const system = `You are ECHO, generating a future-self prediction for ${userName}. Be uncannily specific — reference their actual emotional patterns and identity traits. Not generic horoscope. Behavioral extrapolation.`

  const memoriesBlock = topMemories
    .map((m: { contentChunk: string; emotion: string | null; importanceScore: number }) =>
      `[${m.emotion ?? 'neutral'} · ${Math.round(m.importanceScore * 100)}%]: ${m.contentChunk}`
    )
    .join('\n\n')

  const predictionPrompt = `Generate a future-self prediction for ${userName} at ${timeframeLabel[timeframe]} from now.

DATA:
- Identity traits: ${identityTags.join(', ') || 'not yet discovered'}
- Aspirations: ${aspirations || 'not stated'}
- Emotional arc (30 days): ${emotionalArcSummary}
- Entries written: ${profile?.total_entries ?? 0}
- Streak: ${profile?.current_streak ?? 0} days
- Significant memories:
${memoriesBlock}

Return ONLY valid JSON:
{
  "personaName": "poetic 2-3 word identity title",
  "description": "180-220 words second person deeply specific future portrait",
  "keyTraitShifts": ["shift 1", "shift 2", "shift 3"],
  "confidenceScore": 0.0-1.0
}`

  const predictionText = await callClaude(predictionPrompt, system)

  let prediction: Record<string, unknown>
  try {
    prediction = JSON.parse(predictionText.trim())
  } catch {
    prediction = {
      personaName: 'The Emerging Self',
      description: predictionText,
      keyTraitShifts: [],
      confidenceScore: 0.5,
    }
  }

  // Generate personal letter
  const letterPrompt = `Write a personal letter from ${userName}'s future self, ${timeframeLabel[timeframe]} from now.

Future self persona: ${prediction.personaName}
Portrait: ${prediction.description}

Write 200-260 words. First person from the future self to present self. Warm, specific, honest. Reference specific emotional patterns from their data. Not motivational-poster language — real, grounded, intimate. Start with "Dear [name]," and end with a name or signature.`

  const letter = await callClaude(letterPrompt, `You are writing an intimate letter from ${userName}'s future self. Make it feel real.`)

  // Store simulation
  const { data: simulation, error } = await supabase
    .from('future_self_simulations')
    .insert({
      user_id: user.id,
      timeframe,
      persona_name: prediction.personaName as string,
      description: prediction.description as string,
      key_trait_shifts: prediction.keyTraitShifts as string[],
      confidence_score: prediction.confidenceScore as number,
      letter,
      emotional_arc_snapshot: emotionCounts,
      identity_snapshot: identityTags,
    })
    .select()
    .single()

  if (error) {
    // Table may not exist yet — return result without persisting
    return NextResponse.json({ simulation: { ...prediction, letter }, persisted: false })
  }

  return NextResponse.json({ simulation, persisted: true })
}

