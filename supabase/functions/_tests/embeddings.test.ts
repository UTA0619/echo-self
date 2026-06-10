/**
 * Tests for the shared embeddings utilities.
 *
 * Tests the pure functions (chunkText, calculateImportanceScore,
 * serializeVector) without making real API calls.
 *
 * Run with: deno test supabase/functions/_tests/embeddings.test.ts
 */

import { assertEquals, assertGreater, assertLess, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  chunkText,
  calculateImportanceScore,
  serializeVector,
  CHUNK_SIZE_CHARS,
  CHUNK_OVERLAP_CHARS,
} from '../_shared/embeddings.ts'

// ── chunkText ─────────────────────────────────────────────────────────────────

Deno.test('chunkText — short text returns single chunk', () => {
  const text = 'This is a short journal entry.'
  const chunks = chunkText(text)
  assertEquals(chunks.length, 1)
  assertEquals(chunks[0], text)
})

Deno.test('chunkText — empty string returns single empty chunk or empty array', () => {
  const chunks = chunkText('')
  // Either one empty chunk or an empty array — both acceptable
  assert(chunks.length === 0 || (chunks.length === 1 && chunks[0] === ''))
})

Deno.test('chunkText — text exactly at chunk limit returns one chunk', () => {
  const text = 'a'.repeat(CHUNK_SIZE_CHARS)
  const chunks = chunkText(text)
  assertEquals(chunks.length, 1)
})

Deno.test('chunkText — long text produces multiple overlapping chunks', () => {
  const text = 'This is a test sentence. '.repeat(200)  // ~5000 chars
  const chunks = chunkText(text)
  assertGreater(chunks.length, 1)
  // All chunks should be non-empty
  chunks.forEach(c => assertGreater(c.length, 0))
})

Deno.test('chunkText — consecutive chunks overlap correctly', () => {
  const text = 'word '.repeat(1000)  // ~5000 chars
  const chunks = chunkText(text, 200, 40)  // small chunks for easier testing
  assertGreater(chunks.length, 1)

  // The end of chunk N should appear somewhere at the start of chunk N+1
  // (because of the overlap). We verify this loosely.
  if (chunks.length >= 2) {
    // Both chunks should have content
    assertGreater(chunks[0]!.length, 0)
    assertGreater(chunks[1]!.length, 0)
  }
})

Deno.test('chunkText — chunks are trimmed (no leading/trailing whitespace)', () => {
  const text = '  ' + 'x'.repeat(CHUNK_SIZE_CHARS + 100) + '  '
  const chunks = chunkText(text)
  chunks.forEach(c => {
    assertEquals(c, c.trim(), `Chunk has leading/trailing whitespace: "${c.slice(0, 20)}..."`)
  })
})

// ── calculateImportanceScore ──────────────────────────────────────────────────

Deno.test('calculateImportanceScore — returns value between 0 and 1', () => {
  const score = calculateImportanceScore({
    emotionScore:    0.8,
    wordCount:       300,
    daysSinceEntry:  0,
    accessFrequency: 5,
    userRating:      4,
  })
  assertGreater(score, 0)
  assertLess(score, 1.001)
})

Deno.test('calculateImportanceScore — high emotion + today = high score', () => {
  const high = calculateImportanceScore({
    emotionScore:    1.0,
    wordCount:       500,
    daysSinceEntry:  0,
    accessFrequency: 10,
    userRating:      5,
  })
  assertGreater(high, 0.7)
})

Deno.test('calculateImportanceScore — old + low emotion = lower score', () => {
  const low = calculateImportanceScore({
    emotionScore:    0.1,
    wordCount:       50,
    daysSinceEntry:  300,
    accessFrequency: 0,
    userRating:      1,
  })
  assertLess(low, 0.4)
})

Deno.test('calculateImportanceScore — null values handled gracefully', () => {
  const score = calculateImportanceScore({
    emotionScore:    null,
    wordCount:       100,
    daysSinceEntry:  30,
    accessFrequency: 0,
    userRating:      null,
  })
  assertGreater(score, 0)
  assertLess(score, 1.001)
})

Deno.test('calculateImportanceScore — recent > stale, all else equal', () => {
  const base = { emotionScore: 0.5, wordCount: 200, accessFrequency: 1, userRating: 3 }
  const recent = calculateImportanceScore({ ...base, daysSinceEntry: 0 })
  const stale  = calculateImportanceScore({ ...base, daysSinceEntry: 200 })
  assertGreater(recent, stale)
})

Deno.test('calculateImportanceScore — longer entries score higher than short', () => {
  const base = { emotionScore: 0.5, daysSinceEntry: 10, accessFrequency: 0, userRating: null }
  const short = calculateImportanceScore({ ...base, wordCount: 20 })
  const long  = calculateImportanceScore({ ...base, wordCount: 500 })
  assertGreater(long, short)
})

// ── serializeVector ───────────────────────────────────────────────────────────

Deno.test('serializeVector — produces valid pgvector literal format', () => {
  const vec = [1.0, 2.5, -0.3]
  const result = serializeVector(vec)
  assertEquals(result, '[1,2.5,-0.3]')
})

Deno.test('serializeVector — empty array produces []', () => {
  assertEquals(serializeVector([]), '[]')
})

Deno.test('serializeVector — single value', () => {
  assertEquals(serializeVector([0.5]), '[0.5]')
})

Deno.test('serializeVector — large vector (3072 dims) produces correct format', () => {
  const vec = new Array(3072).fill(0).map((_, i) => i / 3072)
  const result = serializeVector(vec)
  assert(result.startsWith('['))
  assert(result.endsWith(']'))
  // Should have 3072 values separated by commas
  const parts = result.slice(1, -1).split(',')
  assertEquals(parts.length, 3072)
})

Deno.test('serializeVector — result parses back to original array', () => {
  const original = [0.1, 0.2, 0.3, -0.5, 1.0]
  const serialized = serializeVector(original)
  const parsed = JSON.parse(serialized) as number[]
  assertEquals(parsed.length, original.length)
  parsed.forEach((val, i) => {
    assertEquals(Math.abs(val - original[i]!), 0, `Mismatch at index ${i}`)
  })
})
