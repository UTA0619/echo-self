/**
 * Unit tests for pattern-detect aggregation and scoring logic.
 *
 * Tests tag frequency counting, pattern significance threshold, and
 * emotion distribution computation — no API calls required.
 *
 * Run with: deno test supabase/functions/_tests/pattern-detect.test.ts
 */

import {
  assertEquals,
  assert,
  assertArrayIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Replicate aggregation logic from pattern-detect/index.ts ─────────────────

interface TagOccurrence {
  tag: string
  count: number
}

interface EmotionEntry {
  dominant_emotion: string | null
}

/** Returns tags appearing ≥ minCount times, sorted by count desc. */
function getSignificantTags(
  rows: Array<{ tags: string[] }>,
  minCount = 3,
): TagOccurrence[] {
  const freq: Record<string, number> = {}
  rows.forEach(row => {
    row.tags.forEach(tag => {
      freq[tag] = (freq[tag] ?? 0) + 1
    })
  })
  return Object.entries(freq)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
}

/** Returns emotion distribution as { emotion: percentage } for top 5. */
function getEmotionDistribution(
  entries: EmotionEntry[],
): Record<string, number> {
  const total = entries.filter(e => e.dominant_emotion).length
  if (total === 0) return {}

  const counts: Record<string, number> = {}
  entries.forEach(e => {
    if (e.dominant_emotion) {
      counts[e.dominant_emotion] = (counts[e.dominant_emotion] ?? 0) + 1
    }
  })

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return Object.fromEntries(sorted.map(([k, v]) => [k, Math.round((v / total) * 100)]))
}

/** Checks if the total of emotion percentages is roughly ≤ 100 (top-5 slice). */
function percentageSumValid(dist: Record<string, number>): boolean {
  return Object.values(dist).reduce((a, b) => a + b, 0) <= 100
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('getSignificantTags — counts tags correctly', () => {
  const rows = [
    { tags: ['work', 'stress'] },
    { tags: ['work', 'social'] },
    { tags: ['work', 'stress'] },
    { tags: ['creative', 'stress'] },
  ]
  const result = getSignificantTags(rows, 2)
  const tagNames = result.map(t => t.tag)
  assertArrayIncludes(tagNames, ['work', 'stress'])
})

Deno.test('getSignificantTags — filters below minCount', () => {
  const rows = [
    { tags: ['rare'] },
    { tags: ['common', 'common'] },
    { tags: ['common'] },
  ]
  const result = getSignificantTags(rows, 3)
  const tagNames = result.map(t => t.tag)
  assertEquals(tagNames.includes('rare'), false)
})

Deno.test('getSignificantTags — sorted by count desc', () => {
  const rows = [
    { tags: ['a', 'b', 'b', 'b'] },
    { tags: ['a', 'b'] },
    { tags: ['a'] },
  ]
  const result = getSignificantTags(rows, 1)
  assertEquals(result[0].tag, 'b')
  assertEquals(result[0].count, 4)
  assertEquals(result[1].tag, 'a')
  assertEquals(result[1].count, 3)
})

Deno.test('getSignificantTags — returns empty for no tags', () => {
  assertEquals(getSignificantTags([], 1), [])
  assertEquals(getSignificantTags([{ tags: [] }], 1), [])
})

Deno.test('getSignificantTags — default minCount 3', () => {
  const rows = Array.from({ length: 3 }, () => ({ tags: ['recurring'] }))
  const result = getSignificantTags(rows)  // default minCount = 3
  assertEquals(result.length, 1)
  assertEquals(result[0].tag, 'recurring')
})

Deno.test('getEmotionDistribution — calculates percentages', () => {
  const entries = [
    { dominant_emotion: 'joy' },
    { dominant_emotion: 'joy' },
    { dominant_emotion: 'sadness' },
    { dominant_emotion: 'joy' },
  ]
  const dist = getEmotionDistribution(entries)
  assertEquals(dist['joy'], 75)
  assertEquals(dist['sadness'], 25)
})

Deno.test('getEmotionDistribution — ignores null emotions', () => {
  const entries = [
    { dominant_emotion: 'calm' },
    { dominant_emotion: null },
    { dominant_emotion: 'calm' },
  ]
  const dist = getEmotionDistribution(entries)
  assertEquals(dist['calm'], 100)
  assertEquals(Object.keys(dist).includes('null'), false)
})

Deno.test('getEmotionDistribution — returns empty for all-null', () => {
  const entries = [
    { dominant_emotion: null },
    { dominant_emotion: null },
  ]
  assertEquals(getEmotionDistribution(entries), {})
})

Deno.test('getEmotionDistribution — limits to top 5 emotions', () => {
  const emotions = ['joy', 'sadness', 'anger', 'fear', 'calm', 'surprise']
  const entries = emotions.map(e => ({ dominant_emotion: e }))
  const dist = getEmotionDistribution(entries)
  assert(Object.keys(dist).length <= 5)
})

Deno.test('getEmotionDistribution — percentages sum to ≤ 100', () => {
  const entries = [
    { dominant_emotion: 'joy' },
    { dominant_emotion: 'sadness' },
    { dominant_emotion: 'anger' },
    { dominant_emotion: 'fear' },
    { dominant_emotion: 'calm' },
    { dominant_emotion: 'hope' },
    { dominant_emotion: 'joy' },
  ]
  const dist = getEmotionDistribution(entries)
  assert(percentageSumValid(dist))
})

Deno.test('getEmotionDistribution — handles single emotion', () => {
  const entries = [{ dominant_emotion: 'gratitude' }]
  const dist = getEmotionDistribution(entries)
  assertEquals(dist['gratitude'], 100)
})
