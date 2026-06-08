/**
 * ECHO core prompt builder + context window utilities.
 * Deno-compatible copy of:
 *   packages/ai-core/src/prompts/echo.ts
 *   packages/ai-core/src/context/window-manager.ts
 *
 * No @echo-self/* package imports — self-contained for Supabase Deno runtime.
 */

// ── Types (inlined from @echo-self/shared-types) ──────────────────────────────

export type EmotionType =
  | 'joy' | 'sadness' | 'anger' | 'fear'
  | 'surprise' | 'disgust' | 'anticipation' | 'trust'
  | 'optimism' | 'love' | 'awe'

export interface OnboardingData {
  goals?: string[]
  values?: string[]
  identityTags: string[]
  aspirations: string
  streakCommitment: number
  stepCompleted?: number
}

export interface EchoPromptParams {
  userName: string
  onboardingData: OnboardingData | null | undefined
  currentEntry: string
  emotion: EmotionType | null
  emotionScore: number | null
  recentEntries: Array<{ content: string; createdAt: string; emotion: EmotionType | null }>
  retrievedMemories: Array<{
    content_chunk?: string
    contentChunk?: string
    memory_date?: string
    memoryDate?: string
    emotion: EmotionType | null
    similarityScore: number
  }>
  emotionalArcSummary: string
}

// ── Echo system prompt ────────────────────────────────────────────────────────

export function buildEchoSystemPrompt(params: EchoPromptParams): string {
  const {
    userName,
    onboardingData,
    currentEntry,
    emotion,
    emotionScore,
    recentEntries,
    retrievedMemories,
    emotionalArcSummary,
  } = params

  const od = onboardingData ?? { identityTags: [], aspirations: 'growth', streakCommitment: 3 }

  const identityBlock = `IDENTITY PROFILE:
Name: ${userName}
Core traits: ${(od.identityTags ?? []).join(', ') || 'not yet established'}
Aspirations: ${od.aspirations || 'not specified'}
Reflection commitment: ${od.streakCommitment ?? 3} days/week`

  const emotionalArcBlock = `EMOTIONAL ARC (30 days):
${emotionalArcSummary}`

  const memoriesBlock =
    retrievedMemories.length > 0
      ? `MOST RELEVANT MEMORIES:
${retrievedMemories
  .map(m => {
    const chunk = m.contentChunk ?? m.content_chunk ?? ''
    const date = m.memoryDate ?? m.memory_date ?? ''
    const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'past'
    return `[${dateStr}${m.emotion ? ` · ${m.emotion}` : ''} · relevance: ${(m.similarityScore * 100).toFixed(0)}%]: ${chunk}`
  })
  .join('\n\n')}`
      : ''

  const recentBlock =
    recentEntries.length > 0
      ? `RECENT ENTRIES (last 7 days):
${recentEntries
  .slice(0, 5)
  .map(e => {
    const dateStr = new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const preview = e.content.substring(0, 300) + (e.content.length > 300 ? '...' : '')
    return `[${dateStr}${e.emotion ? ` · ${e.emotion}` : ''}]: ${preview}`
  })
  .join('\n\n')}`
      : ''

  const currentBlock = `CURRENT ENTRY:
${currentEntry}
Detected emotion: ${emotion ?? 'undetected'}${emotionScore ? ` (intensity: ${(emotionScore * 100).toFixed(0)}%)` : ''}`

  return `You are ECHO, an emotionally intelligent AI identity mirror for ${userName}.

${identityBlock}

${emotionalArcBlock}

${memoriesBlock ? memoriesBlock + '\n\n' : ''}${recentBlock ? recentBlock + '\n\n' : ''}${currentBlock}

RESPONSE GUIDELINES:
- Speak in second person, warm and direct — you deeply know this person
- Reference specific details from their words — never generic platitudes
- Mirror their emotional reality precisely before gently expanding it
- Length: 150–400 words, conversational, flowing prose
- End with one precise, non-cheesy question that opens reflection
- Never mention being an AI unless directly asked
- Emotional tone must match the detected emotion first, then carefully expand it
- Draw specific connections to their memories when relevant — this is what makes you feel real
- Do not offer advice unless explicitly asked — reflect, don't prescribe`
}

// ── Context window utilities ──────────────────────────────────────────────────

const TOKEN_BUDGET = {
  recentEntries: 3000,
} as const

export function buildEmotionalArcSummary(
  history: Array<{ dominant_emotion?: string; avg_valence?: number; date?: string }>,
): string {
  if (!history || history.length === 0) return 'No emotional history yet.'

  const recent = history.slice(-7)
  const valenceValues = recent.map(h => h.avg_valence ?? 0.5)
  const avgValence = valenceValues.reduce((sum, v) => sum + v, 0) / valenceValues.length

  const emotions = recent
    .map(h => h.dominant_emotion)
    .filter(Boolean) as string[]

  const trend =
    avgValence > 0.6 ? 'positive upward'
    : avgValence < 0.4 ? 'challenging downward'
    : 'balanced and reflective'

  const uniqueEmotions = [...new Set(emotions)].slice(0, 3)

  return `7-day emotional arc: ${trend} trend. Dominant emotions: ${uniqueEmotions.join(', ') || 'mixed'}. Average valence: ${(avgValence * 100).toFixed(0)}%.`
}

export function selectRecentEntries(
  entries: Array<{ content: string; created_at?: string; createdAt?: string; emotion?: string | null }>,
  maxTokens = TOKEN_BUDGET.recentEntries,
): Array<{ content: string; createdAt: string; emotion: EmotionType | null }> {
  const result = []
  let usedChars = 0
  const maxChars = maxTokens * 4

  for (const entry of entries.slice(0, 10)) {
    const createdAt = entry.created_at ?? entry.createdAt ?? new Date().toISOString()
    const text = `[${createdAt}]: ${entry.content}`
    if (usedChars + text.length > maxChars) break
    result.push({
      content: entry.content,
      createdAt,
      emotion: (entry.emotion as EmotionType | null) ?? null,
    })
    usedChars += text.length
  }

  return result
}
