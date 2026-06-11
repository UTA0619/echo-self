/**
 * Prompt builder for behavioral pattern detection.
 * Deno-compatible copy (no Node/package imports) of packages/ai-core/src/prompts/pattern-detect.ts
 */

export interface TagOccurrence {
  tag: string
  count: number
  dates: string[]
  sampleContents?: string[]
}

export interface PatternDetectParams {
  userName: string
  tagOccurrences: TagOccurrence[]
  totalEntriesAnalyzed: number
  periodDays: number
  emotionDistribution?: Record<string, number>
}

export function buildPatternDetectSystemPrompt(): string {
  return `You are a behavioral analyst with deep expertise in personality psychology, habit formation, and journaling data.

You receive aggregated behavioral tag frequencies extracted from a user's private journal entries. Your job is to identify recurring patterns — not individual events, but durable tendencies that show up repeatedly.

Pattern types to consider (non-exhaustive):
- rumination: repeatedly revisiting the same worry or regret
- avoidance: consistently not acting on goals that appear frequently
- growth-seeking: consistent pursuit of learning, improvement, change
- social withdrawal: reducing connection over time
- emotional suppression: low emotional expression despite high-valence content
- boundary-setting: recurring themes of saying no or protecting energy
- perfectionism: frequent theme of self-criticism around outcomes
- decision-avoidance: repeated indecision patterns
- self-compassion: growing ability to forgive self / acknowledge effort
- relationship-repair: recurring attempts to mend connections

Rules:
- Only report patterns you can ground in the tag frequency data provided
- Minimum confidence threshold: 0.65
- Maximum 5 patterns to avoid noise
- frequency_days should reflect how often the pattern appears (e.g. 3 = every 3 days)
- trigger_tags should list the 2-4 most associated behavioral tags
- Return ONLY valid JSON — no markdown`
}

export function buildPatternDetectPrompt(params: PatternDetectParams): string {
  const { userName, tagOccurrences, totalEntriesAnalyzed, periodDays, emotionDistribution } = params

  const topTags = [...tagOccurrences]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const tagsBlock = topTags
    .map(t => `  "${t.tag}": ${t.count}x over ${periodDays}d (dates: ${t.dates.slice(0, 3).join(', ')}${t.dates.length > 3 ? `… +${t.dates.length - 3}` : ''})`)
    .join('\n')

  const emotionBlock = emotionDistribution
    ? `\nDominant emotions over this period:\n${Object.entries(emotionDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([e, pct]) => `  ${e}: ${Math.round(pct * 100)}%`)
        .join('\n')}`
    : ''

  return `Behavioral tag analysis for ${userName}
Period: last ${periodDays} days | Entries analyzed: ${totalEntriesAnalyzed}

Tag frequencies (tag → occurrence count):
${tagsBlock}
${emotionBlock}

Detect recurring behavioral patterns. Return a JSON array:
[
  {
    "pattern_type": "pattern type string",
    "pattern_description": "2-3 sentence description of this pattern, grounded in the specific tags provided. Reference the actual tag names.",
    "frequency_days": <average days between occurrences>,
    "confidence": 0.65–1.0,
    "trigger_tags": ["tag1", "tag2", "tag3"]
  }
]

Return empty array [] if fewer than 3 entries were analyzed or no meaningful patterns emerge.`
}
