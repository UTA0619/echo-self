/**
 * Prompt builder for the daily insight push notification.
 * Deno-compatible copy of packages/ai-core/src/prompts/daily-insight.ts
 */

export interface DailyInsightParams {
  userName: string
  recentMemories: string[]
  emotionArc: string
  topTags: string[]
  streakDays: number
}

export function buildDailyInsightPrompt(params: DailyInsightParams): string {
  const { userName, recentMemories, emotionArc, topTags, streakDays } = params

  const memoriesText = recentMemories
    .slice(0, 8)
    .map((m, i) => `${i + 1}. ${m}`)
    .join('\n')

  return `Generate one ultra-specific daily insight for ${userName}.

RECENT MEMORIES:
${memoriesText || '(no memories yet)'}

EMOTIONAL ARC THIS WEEK: ${emotionArc || 'building baseline'}
DOMINANT PATTERNS: ${topTags.slice(0, 5).join(', ') || 'none identified yet'}
REFLECTION STREAK: ${streakDays} days

RULES:
- Exactly 1–2 sentences, max 160 characters total (notification-length)
- Reference something specific from their actual memories — never generic
- Name the pattern, not just the behavior
- Tone: a perceptive friend who knows them well, not a therapist
- No emojis, no hashtags, no quotes
- If streak ≥ 7: acknowledge their consistency subtly in the phrasing

Return JSON:
{
  "insight": "Your one-sentence insight here.",
  "push_title": "ECHO"
}`
}

export function buildDailyInsightSystemPrompt(): string {
  return `You are ECHO, an AI identity mirror. You generate short, piercing daily insights from patterns in people's journals. You notice things they don't. You are warm but never fluffy. Every word earns its place.`
}
