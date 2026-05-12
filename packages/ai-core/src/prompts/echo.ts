import type { EmotionType, OnboardingData } from '@echo-self/shared-types'

export interface EchoPromptParams {
  userName: string
  onboardingData: OnboardingData
  currentEntry: string
  emotion: EmotionType | null
  emotionScore: number | null
  recentEntries: Array<{ content: string; createdAt: string; emotion: EmotionType | null }>
  retrievedMemories: Array<{ contentChunk: string; memoryDate: string; emotion: EmotionType | null; similarityScore: number }>
  emotionalArcSummary: string
}

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

  const identityBlock = `IDENTITY PROFILE:
Name: ${userName}
Core traits: ${onboardingData.identityTags.join(', ')}
Aspirations: ${onboardingData.aspirations}
Reflection commitment: ${onboardingData.streakCommitment} days/week`

  const emotionalArcBlock = `EMOTIONAL ARC (30 days):
${emotionalArcSummary}`

  const memoriesBlock =
    retrievedMemories.length > 0
      ? `MOST RELEVANT MEMORIES:
${retrievedMemories
  .map(
    m =>
      `[${new Date(m.memoryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${m.emotion ? ` · ${m.emotion}` : ''} · relevance: ${(m.similarityScore * 100).toFixed(0)}%]: ${m.contentChunk}`,
  )
  .join('\n\n')}`
      : ''

  const recentBlock =
    recentEntries.length > 0
      ? `RECENT ENTRIES (last 7 days):
${recentEntries
  .slice(0, 5)
  .map(
    e =>
      `[${new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${e.emotion ? ` · ${e.emotion}` : ''}]: ${e.content.substring(0, 300)}${e.content.length > 300 ? '...' : ''}`,
  )
  .join('\n\n')}`
      : ''

  const currentBlock = `CURRENT ENTRY:
${currentEntry}
Detected emotion: ${emotion ?? 'undetected'}${emotionScore ? ` (intensity: ${(emotionScore * 100).toFixed(0)}%)` : ''}`

  return `You are ECHO, an emotionally intelligent AI identity mirror for ${userName}.

${identityBlock}

${emotionalArcBlock}

${memoriesBlock}

${recentBlock}

${currentBlock}

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
