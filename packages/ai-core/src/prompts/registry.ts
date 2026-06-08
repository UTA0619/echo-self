/**
 * Prompt Registry — versioned manifest for all ECHO AI prompts.
 *
 * Every prompt builder in this package is registered here with:
 *  - version string (semver-like: major.minor)
 *  - model affinity (which model this prompt was tuned for)
 *  - description
 *  - changelog of breaking changes
 *
 * Usage:
 *   import { PROMPT_REGISTRY, getPromptMeta } from '@echo-self/ai-core'
 *   const meta = getPromptMeta('echo-response')
 *   console.log(meta.version) // '2.1'
 *
 * Edge functions should log the prompt version in their structured output
 * so we can trace inference quality regressions to specific prompt changes.
 */

export interface PromptMeta {
  /** Unique identifier, kebab-case. Matches the function prefix. */
  id: string
  /** Semver-lite: "major.minor". Increment major on breaking schema changes. */
  version: string
  /** Primary model this was tuned/tested against. */
  model: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
  /** Human-readable purpose. */
  description: string
  /** ISO date of last substantive change. */
  updatedAt: string
  /** Notable changes by version. Older versions listed first. */
  changelog: Array<{ version: string; note: string }>
}

export const PROMPT_REGISTRY: Readonly<PromptMeta[]> = [
  {
    id:          'echo-response',
    version:     '2.0',
    model:       'claude-sonnet-4-6',
    description: 'Core journaling response — empathic reflection with memory grounding.',
    updatedAt:   '2026-05-01',
    changelog: [
      { version: '1.0', note: 'Initial GPT-4o prompt.' },
      { version: '2.0', note: 'Ported to Claude Sonnet; added identity-node grounding context.' },
    ],
  },
  {
    id:          'emotion-analyze',
    version:     '1.2',
    model:       'claude-haiku-4-5-20251001',
    description: 'Classifies the dominant emotion and intensity from a journal entry.',
    updatedAt:   '2026-04-15',
    changelog: [
      { version: '1.0', note: 'Initial GPT-3.5-turbo prompt.' },
      { version: '1.1', note: 'Added 12-emotion taxonomy.' },
      { version: '1.2', note: 'Migrated to Claude Haiku; added secondary emotion output.' },
    ],
  },
  {
    id:          'behavioral-tag',
    version:     '1.1',
    model:       'claude-haiku-4-5-20251001',
    description: 'Extracts behavioral and contextual tags from an entry (e.g. #social, #work).',
    updatedAt:   '2026-04-20',
    changelog: [
      { version: '1.0', note: 'Initial GPT-3.5-turbo prompt.' },
      { version: '1.1', note: 'Migrated to Claude Haiku; added tag confidence scoring.' },
    ],
  },
  {
    id:          'identity-infer',
    version:     '1.3',
    model:       'claude-sonnet-4-6',
    description: 'Extracts identity signals (beliefs, values, patterns) from a journal entry.',
    updatedAt:   '2026-05-20',
    changelog: [
      { version: '1.0', note: 'Initial prompt — no de-duplication context.' },
      { version: '1.1', note: 'Added IDENTITY_TAXONOMY enum constraint.' },
      { version: '1.2', note: 'Added existing-nodes context for de-duplication.' },
      { version: '1.3', note: 'Refined polarity detection; added evidence[] array.' },
    ],
  },
  {
    id:          'pattern-detect',
    version:     '1.1',
    model:       'claude-sonnet-4-6',
    description: 'Detects recurring behavioral patterns from weekly tag aggregations.',
    updatedAt:   '2026-05-22',
    changelog: [
      { version: '1.0', note: 'Initial pattern detection.' },
      { version: '1.1', note: 'Fixed data source: reads entry_behavioral_tags table, not entries.tags.' },
    ],
  },
  {
    id:          'safety-response',
    version:     '1.2',
    model:       'claude-haiku-4-5-20251001',
    description: 'Generates a compassionate safety acknowledgment for distress signals.',
    updatedAt:   '2026-05-25',
    changelog: [
      { version: '1.0', note: 'Initial safety response.' },
      { version: '1.1', note: 'Added CRISIS_RESOURCES_STATIC bypass for crisis level.' },
      { version: '1.2', note: 'Added emotionArc context; tuned tone for high vs moderate risk.' },
    ],
  },
  {
    id:          'daily-insight',
    version:     '1.1',
    model:       'claude-haiku-4-5-20251001',
    description: 'Generates a short personalized insight for the daily push notification.',
    updatedAt:   '2026-05-15',
    changelog: [
      { version: '1.0', note: 'Initial daily insight prompt.' },
      { version: '1.1', note: 'Added streak context; tightened to 2-sentence output.' },
    ],
  },
  {
    id:          'future-self',
    version:     '2.0',
    model:       'claude-sonnet-4-6',
    description: 'Simulates the user\'s future self at 1/3/12-month horizons; generates narrative + letter.',
    updatedAt:   '2026-05-28',
    changelog: [
      { version: '1.0', note: 'Initial GPT-4o prompt.' },
      { version: '2.0', note: 'Ported to Claude Sonnet; added trajectory_score (0-100) output.' },
    ],
  },
] as const

/** Fast O(1) lookup by prompt id. */
const _index = new Map(PROMPT_REGISTRY.map(m => [m.id, m]))

/**
 * Returns the prompt metadata for a given id.
 * Returns undefined if the id is not registered.
 */
export function getPromptMeta(id: string): PromptMeta | undefined {
  return _index.get(id)
}

/**
 * Returns a structured log object suitable for embedding in edge function logs.
 * Example: console.log(JSON.stringify(promptLogEntry('echo-response')))
 */
export function promptLogEntry(id: string): Record<string, unknown> {
  const meta = _index.get(id)
  if (!meta) return { prompt_id: id, prompt_version: 'unknown' }
  return {
    prompt_id:      meta.id,
    prompt_version: meta.version,
    prompt_model:   meta.model,
  }
}
