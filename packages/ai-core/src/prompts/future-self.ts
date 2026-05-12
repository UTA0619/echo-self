import type { PredictionTimeframe, EmotionType } from '@echo-self/shared-types'

export interface FutureSelfPromptParams {
  userName: string
  aspirations: string
  identityTags: string[]
  timeframe: PredictionTimeframe
  emotionalArcSummary: string
  topMemories: Array<{ contentChunk: string; emotion: EmotionType | null; importanceScore: number }>
  entryCount: number
  currentStreakDays: number
}

const ARCHETYPES = ['visionary', 'healer', 'creator', 'rebel', 'sage', 'explorer', 'guardian', 'alchemist'] as const

export function buildFutureSelfPrompt(params: FutureSelfPromptParams): string {
  const { userName, aspirations, identityTags, timeframe, emotionalArcSummary, topMemories, entryCount, currentStreakDays } = params

  const timeframeLabel = { '30d': '30 days', '90d': '90 days', '1yr': '1 year' }[timeframe]

  const memoriesBlock = topMemories
    .slice(0, 8)
    .map(m => `[importance: ${(m.importanceScore * 100).toFixed(0)}%${m.emotion ? ` · ${m.emotion}` : ''}]: ${m.contentChunk}`)
    .join('\n\n')

  return `You are generating a future-self prediction for ${userName}.

DATA:
- Core identity traits: ${identityTags.join(', ')}
- Aspirations: ${aspirations}
- Emotional arc (30 days): ${emotionalArcSummary}
- Journal entries written: ${entryCount}
- Current reflection streak: ${currentStreakDays} days
- Most significant memories:
${memoriesBlock}

PREDICTION TIMEFRAME: ${timeframeLabel} from now

Generate a deeply personal, specific future-self prediction based on the behavioral patterns, emotional trajectory, and stated aspirations. This must feel uncanny in its specificity — not generic.

Respond ONLY with valid JSON:
{
  "personaName": string (a poetic 2-3 word identity title, e.g. "The Quiet Architect"),
  "description": string (180-220 words, second person, deeply specific, emotionally resonant),
  "keyTraitShifts": string[] (3-4 specific behavioral/emotional shifts you predict),
  "confidenceScore": number between 0.4 and 0.95,
  "visualArchetype": one of ${ARCHETYPES.map(a => `"${a}"`).join(' | ')}
}

Make the description reference specific themes from their memories and emotional arc. This is not horoscope — it is behavioral extrapolation.`
}
