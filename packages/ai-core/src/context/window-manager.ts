import type { Entry, Memory, EmotionHistoryPoint } from '@echo-self/shared-types'

const TOKEN_BUDGET = {
  systemBase: 800,
  identityProfile: 400,
  currentEntry: 1000,
  recentEntries: 3000,
  memories: 2000,
  emotionalArc: 500,
  total: 7700,
} as const

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  // Approximate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars - 3) + '...'
}

export function buildEmotionalArcSummary(history: EmotionHistoryPoint[]): string {
  if (history.length === 0) return 'No emotional history yet.'

  const recent = history.slice(-7)
  const avgValence = recent.reduce((sum, h) => sum + h.avgValence, 0) / recent.length

  const dominantEmotions = recent
    .flatMap(h => Object.entries(h.emotionCounts))
    .reduce(
      (acc, [emotion, count]) => {
        acc[emotion] = (acc[emotion] ?? 0) + count
        return acc
      },
      {} as Record<string, number>,
    )

  const topEmotions = Object.entries(dominantEmotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([e]) => e)

  const trend = avgValence > 0.6 ? 'positive upward' : avgValence < 0.4 ? 'challenging downward' : 'balanced and reflective'

  return `7-day emotional arc: ${trend} trend. Dominant emotions: ${topEmotions.join(', ')}. Average emotional valence: ${(avgValence * 100).toFixed(0)}%.`
}

export function selectRecentEntries(
  entries: Entry[],
  maxTokens = TOKEN_BUDGET.recentEntries,
): Array<{ content: string; createdAt: string; emotion: Entry['emotion'] }> {
  const result = []
  let usedChars = 0
  const maxChars = maxTokens * 4

  for (const entry of entries.slice(0, 10)) {
    const text = `[${entry.createdAt}]: ${entry.content}`
    if (usedChars + text.length > maxChars) break
    result.push({ content: entry.content, createdAt: entry.createdAt, emotion: entry.emotion })
    usedChars += text.length
  }

  return result
}
