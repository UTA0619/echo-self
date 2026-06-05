/**
 * Prompt builder for behavioral tagging.
 *
 * Used by the behavioral-tag edge function to extract machine-readable
 * behavioral tags from a journal entry using Claude Haiku.
 */

export interface BehavioralTagParams {
  content: string
  existingTags?: string[]
  userName?: string
}

export interface BehavioralTagOutput {
  tags: string[]
  dominant_theme: string
  growth_indicators: string[]
  risk_indicators: string[]
}

export const BEHAVIORAL_TAG_TAXONOMY = [
  // Mindset
  'growth-mindset', 'fixed-mindset', 'resilience', 'self-compassion', 'perfectionism',
  'optimism', 'pessimism', 'gratitude', 'rumination', 'self-awareness',

  // Relationships
  'connection', 'isolation', 'conflict', 'vulnerability', 'boundary-setting',
  'people-pleasing', 'interdependence', 'loneliness', 'intimacy', 'trust',

  // Work & achievement
  'focused', 'distracted', 'procrastination', 'momentum', 'burnout',
  'creative', 'blocked', 'ambitious', 'overwhelmed', 'productive',

  // Identity
  'authenticity', 'self-doubt', 'confidence', 'purpose', 'lost',
  'clarity', 'values-alignment', 'identity-shift', 'belonging', 'comparison',

  // Body & energy
  'energized', 'depleted', 'rest', 'movement', 'neglect',
  'regulated', 'dysregulated', 'embodied', 'dissociated',

  // Life navigation
  'decision-making', 'avoidance', 'risk-taking', 'comfort-zone', 'transition',
  'planning', 'adaptability', 'routine', 'spontaneity', 'loss',
] as const

export type BehavioralTag = typeof BEHAVIORAL_TAG_TAXONOMY[number]

export function buildBehavioralTagPrompt(params: BehavioralTagParams): string {
  const { content, existingTags = [], userName = 'the user' } = params

  const taxonomyText = BEHAVIORAL_TAG_TAXONOMY.join(', ')

  return `Analyze this journal entry from ${userName} and extract behavioral tags.

JOURNAL ENTRY:
${content}

${existingTags.length > 0 ? `THEIR EXISTING TAGS (for continuity): ${existingTags.join(', ')}` : ''}

AVAILABLE TAGS:
${taxonomyText}

Return valid JSON ONLY:
{
  "tags": ["tag1", "tag2", ...],
  "dominant_theme": "one sentence describing the central psychological theme",
  "growth_indicators": ["evidence of growth or positive movement (up to 3)"],
  "risk_indicators": ["early warning signs worth noting (up to 2, be specific not alarmist)"]
}

Rules:
- Select 3–8 tags that genuinely apply (quality over quantity)
- Tags must come from the provided list only
- dominant_theme must reference something specific from the entry
- Be precise and compassionate — this informs ${userName}'s identity model`
}
