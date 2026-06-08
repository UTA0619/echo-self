/**
 * Unit tests for future-self simulation logic.
 *
 * Tests the pure functions: JSON extraction, output validation,
 * trajectory score clamping, and horizon label mapping.
 *
 * Run with: deno test supabase/functions/_tests/future-self.test.ts
 */

import { assertEquals, assertGreater, assertLessOrEqual, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Helpers extracted from update-future-self edge function ──────────────────

interface SimulationOutput {
  narrative:        string
  letter_text:      string
  trajectory_score: number
}

function extractSimulationJson(text: string): SimulationOutput | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as Partial<SimulationOutput>
    if (
      typeof parsed.narrative        !== 'string' ||
      typeof parsed.letter_text      !== 'string' ||
      typeof parsed.trajectory_score !== 'number'
    ) {
      return null
    }
    return parsed as SimulationOutput
  } catch {
    return null
  }
}

function clampTrajectoryScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function horizonLabel(months: 1 | 3 | 12): string {
  switch (months) {
    case 1:  return '1 month'
    case 3:  return '3 months'
    case 12: return '1 year'
  }
}

function buildEmotionSummary(emotions: string[]): string {
  if (emotions.length === 0) return 'Dominant emotion: neutral (0% of entries)'

  const counts: Record<string, number> = {}
  emotions.forEach(e => { counts[e] = (counts[e] ?? 0) + 1 })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]!
  const pct = Math.round((top[1] / emotions.length) * 100)
  return `Dominant emotion over last ${emotions.length} entries: ${top[0]} (${pct}% of entries)`
}

function isValidSimulationOutput(output: SimulationOutput): boolean {
  if (!output.narrative || output.narrative.trim().length < 20) return false
  if (!output.letter_text || output.letter_text.length < 50) return false
  if (output.trajectory_score < 0 || output.trajectory_score > 100) return false
  return true
}

// ── extractSimulationJson ─────────────────────────────────────────────────────

Deno.test('extractSimulationJson — clean JSON response', () => {
  const text = JSON.stringify({
    narrative: 'You are becoming more grounded in your values.',
    letter_text: 'Hey friend, I am writing to you from a year ahead.',
    trajectory_score: 72,
  })
  const result = extractSimulationJson(text)
  assert(result !== null)
  assertEquals(result!.trajectory_score, 72)
  assert(result!.narrative.includes('grounded'))
  assert(result!.letter_text.includes('Hey friend'))
})

Deno.test('extractSimulationJson — JSON wrapped in prose', () => {
  const text = `Here is the simulation for you:

\`\`\`
{"narrative":"Growing steadily.","letter_text":"Hey there, you made it.","trajectory_score":65}
\`\`\``
  const result = extractSimulationJson(text)
  assert(result !== null)
  assertEquals(result!.trajectory_score, 65)
})

Deno.test('extractSimulationJson — returns null for non-JSON', () => {
  assertEquals(extractSimulationJson('Sorry, I cannot do that.'), null)
  assertEquals(extractSimulationJson(''), null)
})

Deno.test('extractSimulationJson — returns null for missing required fields', () => {
  const partial = JSON.stringify({ narrative: 'Some text', trajectory_score: 60 })
  // Missing letter_text
  const result = extractSimulationJson(partial)
  assertEquals(result, null)
})

Deno.test('extractSimulationJson — returns null when trajectory_score is wrong type', () => {
  const wrong = JSON.stringify({
    narrative: 'Growing.',
    letter_text: 'Hey, you are doing great.',
    trajectory_score: '72',  // string, not number
  })
  const result = extractSimulationJson(wrong)
  assertEquals(result, null)
})

// ── clampTrajectoryScore ──────────────────────────────────────────────────────

Deno.test('clampTrajectoryScore — valid range passthrough', () => {
  assertEquals(clampTrajectoryScore(0), 0)
  assertEquals(clampTrajectoryScore(50), 50)
  assertEquals(clampTrajectoryScore(100), 100)
})

Deno.test('clampTrajectoryScore — clamps below 0', () => {
  assertEquals(clampTrajectoryScore(-10), 0)
  assertEquals(clampTrajectoryScore(-999), 0)
})

Deno.test('clampTrajectoryScore — clamps above 100', () => {
  assertEquals(clampTrajectoryScore(101), 100)
  assertEquals(clampTrajectoryScore(9999), 100)
})

Deno.test('clampTrajectoryScore — rounds fractional values', () => {
  assertEquals(clampTrajectoryScore(72.4), 72)
  assertEquals(clampTrajectoryScore(72.5), 73)
  assertEquals(clampTrajectoryScore(72.6), 73)
})

// ── horizonLabel ──────────────────────────────────────────────────────────────

Deno.test('horizonLabel — all valid horizons', () => {
  assertEquals(horizonLabel(1),  '1 month')
  assertEquals(horizonLabel(3),  '3 months')
  assertEquals(horizonLabel(12), '1 year')
})

// ── buildEmotionSummary ───────────────────────────────────────────────────────

Deno.test('buildEmotionSummary — empty input returns neutral', () => {
  const summary = buildEmotionSummary([])
  assert(summary.includes('neutral'))
})

Deno.test('buildEmotionSummary — single emotion', () => {
  const summary = buildEmotionSummary(['joy'])
  assert(summary.includes('joy'))
  assert(summary.includes('100%'))
})

Deno.test('buildEmotionSummary — mixed emotions picks dominant', () => {
  const emotions = ['joy', 'joy', 'joy', 'sadness', 'fear']
  const summary = buildEmotionSummary(emotions)
  assert(summary.includes('joy'))
  assert(summary.includes('60%'))
})

Deno.test('buildEmotionSummary — includes total entry count', () => {
  const emotions = Array(14).fill('hope')
  const summary = buildEmotionSummary(emotions)
  assert(summary.includes('14'))
})

// ── isValidSimulationOutput ───────────────────────────────────────────────────

Deno.test('isValidSimulationOutput — valid output passes', () => {
  const output: SimulationOutput = {
    narrative:        'You are building momentum. Your consistency is starting to compound.',
    letter_text:      'Hey you, I am writing from three months ahead. Things changed.',
    trajectory_score: 75,
  }
  assert(isValidSimulationOutput(output))
})

Deno.test('isValidSimulationOutput — empty narrative fails', () => {
  const output: SimulationOutput = {
    narrative:        '',
    letter_text:      'Hey you, writing from the future.',
    trajectory_score: 75,
  }
  assert(!isValidSimulationOutput(output))
})

Deno.test('isValidSimulationOutput — too-short letter fails', () => {
  const output: SimulationOutput = {
    narrative:        'You are growing and changing in meaningful ways.',
    letter_text:      'Hi.',
    trajectory_score: 75,
  }
  assert(!isValidSimulationOutput(output))
})

Deno.test('isValidSimulationOutput — out-of-range score fails', () => {
  const validText = 'You are making real progress every single day toward your goals.'
  const validLetter = 'Hey there, this is your future self writing from three months ahead.'
  assert(!isValidSimulationOutput({ narrative: validText, letter_text: validLetter, trajectory_score: -1 }))
  assert(!isValidSimulationOutput({ narrative: validText, letter_text: validLetter, trajectory_score: 101 }))
  assert(isValidSimulationOutput({ narrative: validText, letter_text: validLetter, trajectory_score: 0 }))
  assert(isValidSimulationOutput({ narrative: validText, letter_text: validLetter, trajectory_score: 100 }))
})
