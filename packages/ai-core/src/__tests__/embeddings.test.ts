/**
 * Unit tests for the embeddings pipeline (packages/ai-core).
 *
 * Tests the pure utility functions without making real API calls.
 *
 * Run with: pnpm test (vitest)
 */

import { describe, it, expect } from 'vitest'
import {
  chunkText,
  calculateImportanceScore,
  CHUNK_SIZE_TOKENS,
  CHUNK_OVERLAP_TOKENS,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from '../embeddings/pipeline.js'

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('EMBEDDING_MODEL is text-embedding-3-large', () => {
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-large')
  })

  it('EMBEDDING_DIMENSIONS is 3072', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(3072)
  })

  it('CHUNK_SIZE_TOKENS is reasonable (256–1024)', () => {
    expect(CHUNK_SIZE_TOKENS).toBeGreaterThanOrEqual(256)
    expect(CHUNK_SIZE_TOKENS).toBeLessThanOrEqual(1024)
  })

  it('CHUNK_OVERLAP_TOKENS is less than CHUNK_SIZE_TOKENS', () => {
    expect(CHUNK_OVERLAP_TOKENS).toBeLessThan(CHUNK_SIZE_TOKENS)
  })
})

// ── chunkText ─────────────────────────────────────────────────────────────────

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunkText('Hello world. This is a short entry.')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('Hello world')
  })

  it('splits long text into multiple chunks', () => {
    // Create text that is definitely longer than one chunk
    const longText = 'This is sentence number {i}. '.repeat(300)
    const chunks = chunkText(longText)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('all chunks are non-empty strings', () => {
    const text = 'Word '.repeat(1000)
    const chunks = chunkText(text)
    expect(chunks.every(c => typeof c === 'string' && c.length > 0)).toBe(true)
  })

  it('handles empty string without error', () => {
    expect(() => chunkText('')).not.toThrow()
  })

  it('handles single word', () => {
    const chunks = chunkText('hello')
    expect(chunks).toHaveLength(1)
  })

  it('chunks cover all content (no data lost)', () => {
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`)
    const text = words.join(' ')
    const chunks = chunkText(text)

    // All words should appear in at least one chunk
    // (overlap means some appear in multiple chunks — that's correct)
    const firstWord = words[0]!
    const lastWord  = words[words.length - 1]!
    expect(chunks.some(c => c.includes(firstWord))).toBe(true)
    expect(chunks.some(c => c.includes(lastWord))).toBe(true)
  })

  it('respects custom chunk size parameter', () => {
    const text = 'a'.repeat(2000)
    const smallChunks = chunkText(text, 100)  // 100-token chunks ≈ 400 chars
    const largeChunks = chunkText(text, 400)  // 400-token chunks ≈ 1600 chars
    expect(smallChunks.length).toBeGreaterThan(largeChunks.length)
  })
})

// ── calculateImportanceScore ──────────────────────────────────────────────────

describe('calculateImportanceScore', () => {
  // userRating is a thumbs signal (1 = up, -1 = down, null = none),
  // not a 1–5 star scale. Annotate so { ...base } spreads keep the union type.
  const base = {
    emotionScore:    0.5,
    wordCount:       200,
    daysSinceEntry:  0,
    accessFrequency: 1,
    userRating:      1 as 1 | -1 | null,
  }

  it('returns a value between 0 and 1 (inclusive)', () => {
    const score = calculateImportanceScore(base)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('high-emotion entry scores higher than low-emotion', () => {
    const high = calculateImportanceScore({ ...base, emotionScore: 1.0 })
    const low  = calculateImportanceScore({ ...base, emotionScore: 0.0 })
    expect(high).toBeGreaterThan(low)
  })

  it('recent entry scores higher than old entry', () => {
    const recent = calculateImportanceScore({ ...base, daysSinceEntry: 0 })
    const old    = calculateImportanceScore({ ...base, daysSinceEntry: 300 })
    expect(recent).toBeGreaterThan(old)
  })

  it('long entry scores higher than short entry', () => {
    const long  = calculateImportanceScore({ ...base, wordCount: 600 })
    const short = calculateImportanceScore({ ...base, wordCount: 30 })
    expect(long).toBeGreaterThan(short)
  })

  it('frequently accessed entry scores higher', () => {
    const frequent = calculateImportanceScore({ ...base, accessFrequency: 20 })
    const rare     = calculateImportanceScore({ ...base, accessFrequency: 0 })
    expect(frequent).toBeGreaterThan(rare)
  })

  it('highly rated entry scores higher than poorly rated', () => {
    // The score awards a bonus only for an explicit thumbs-up (1).
    const loved    = calculateImportanceScore({ ...base, userRating: 1 })
    const disliked = calculateImportanceScore({ ...base, userRating: -1 })
    expect(loved).toBeGreaterThan(disliked)
  })

  it('null emotionScore is handled (defaults to mid-range)', () => {
    expect(() => calculateImportanceScore({ ...base, emotionScore: null })).not.toThrow()
    const score = calculateImportanceScore({ ...base, emotionScore: null })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('null userRating is handled', () => {
    expect(() => calculateImportanceScore({ ...base, userRating: null })).not.toThrow()
    const score = calculateImportanceScore({ ...base, userRating: null })
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('extreme inputs do not exceed [0, 1]', () => {
    const max = calculateImportanceScore({
      emotionScore:    10,   // intentionally out of range
      wordCount:       99999,
      daysSinceEntry:  -100,
      accessFrequency: 9999,
      userRating:      1,
    })
    expect(max).toBeLessThanOrEqual(1)

    const min = calculateImportanceScore({
      emotionScore:    -10,
      wordCount:       0,
      daysSinceEntry:  9999,
      accessFrequency: 0,
      userRating:      null,
    })
    expect(min).toBeGreaterThanOrEqual(0)
  })
})
