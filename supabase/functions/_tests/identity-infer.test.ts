/**
 * Unit tests for identity-infer prompt + output parsing logic.
 *
 * Tests JSON extraction, de-duplication detection, and confidence clamping
 * without making real API calls.
 *
 * Run with: deno test supabase/functions/_tests/identity-infer.test.ts
 */

import {
  assertEquals,
  assertExists,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Replicate output parsing from identity-infer/index.ts ────────────────────

interface IdentityNode {
  type: string
  label: string
  description: string
  polarity: 'positive' | 'negative' | 'neutral'
  confidence: number
  evidence: string[]
}

const VALID_TYPES = new Set([
  'belief', 'value', 'core_fear', 'core_desire',
  'behavioral_pattern', 'relationship_pattern', 'strength',
])

function extractJsonArray(text: string): unknown[] | null {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function validateNode(node: unknown): node is IdentityNode {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  return (
    typeof n.type === 'string' && VALID_TYPES.has(n.type) &&
    typeof n.label === 'string' && n.label.length > 0 &&
    typeof n.description === 'string' &&
    ['positive', 'negative', 'neutral'].includes(n.polarity as string) &&
    typeof n.confidence === 'number' && n.confidence >= 0 && n.confidence <= 1 &&
    Array.isArray(n.evidence)
  )
}

function clampConfidence(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function isDuplicate(label: string, existing: Array<{ label: string }>): boolean {
  const lower = label.toLowerCase()
  return existing.some(n => n.label.toLowerCase() === lower)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('extractJsonArray — parses valid JSON array', () => {
  const input = 'Here is the result:\n[{"type":"belief","label":"I am capable"}]'
  const result = extractJsonArray(input)
  assertExists(result)
  assertEquals(result.length, 1)
})

Deno.test('extractJsonArray — extracts array embedded in prose', () => {
  const input = 'Analysis done. [\n  {"type":"value","label":"Honesty"}\n] End.'
  const result = extractJsonArray(input)
  assertExists(result)
  assertEquals((result[0] as Record<string, unknown>).label, 'Honesty')
})

Deno.test('extractJsonArray — returns null for non-JSON', () => {
  assertEquals(extractJsonArray('No array here'), null)
  assertEquals(extractJsonArray(''), null)
  assertEquals(extractJsonArray('{ "not": "array" }'), null)
})

Deno.test('extractJsonArray — handles malformed JSON gracefully', () => {
  assertEquals(extractJsonArray('[{bad json}]'), null)
})

Deno.test('validateNode — accepts a fully valid node', () => {
  const node = {
    type: 'belief',
    label: 'I am capable of growth',
    description: 'User demonstrates learning orientation',
    polarity: 'positive',
    confidence: 0.8,
    evidence: ['entry-123'],
  }
  assert(validateNode(node))
})

Deno.test('validateNode — rejects unknown type', () => {
  const node = {
    type: 'unknown_type',
    label: 'Something',
    description: 'Desc',
    polarity: 'positive',
    confidence: 0.5,
    evidence: [],
  }
  assertEquals(validateNode(node), false)
})

Deno.test('validateNode — rejects out-of-range confidence', () => {
  const node = {
    type: 'belief',
    label: 'Label',
    description: 'Desc',
    polarity: 'positive',
    confidence: 1.5,  // invalid — above 1
    evidence: [],
  }
  assertEquals(validateNode(node), false)
})

Deno.test('validateNode — rejects missing label', () => {
  const node = {
    type: 'value',
    label: '',  // empty
    description: 'Desc',
    polarity: 'neutral',
    confidence: 0.6,
    evidence: [],
  }
  assertEquals(validateNode(node), false)
})

Deno.test('validateNode — rejects invalid polarity', () => {
  const node = {
    type: 'strength',
    label: 'Resilience',
    description: 'Desc',
    polarity: 'unknown',  // invalid
    confidence: 0.7,
    evidence: [],
  }
  assertEquals(validateNode(node), false)
})

Deno.test('clampConfidence — clamps to [0, 1]', () => {
  assertEquals(clampConfidence(-0.5), 0)
  assertEquals(clampConfidence(1.5), 1)
  assertEquals(clampConfidence(0.75), 0.75)
  assertEquals(clampConfidence(0), 0)
  assertEquals(clampConfidence(1), 1)
})

Deno.test('isDuplicate — detects exact match', () => {
  const existing = [{ label: 'Fear of failure' }]
  assert(isDuplicate('Fear of failure', existing))
})

Deno.test('isDuplicate — case-insensitive match', () => {
  const existing = [{ label: 'fear of failure' }]
  assert(isDuplicate('FEAR OF FAILURE', existing))
})

Deno.test('isDuplicate — no false positives', () => {
  const existing = [{ label: 'Fear of failure' }]
  assertEquals(isDuplicate('Fear of rejection', existing), false)
  assertEquals(isDuplicate('', existing), false)
})

Deno.test('VALID_TYPES — all taxonomy types are present', () => {
  const expected = ['belief', 'value', 'core_fear', 'core_desire', 'behavioral_pattern', 'relationship_pattern', 'strength']
  expected.forEach(t => assert(VALID_TYPES.has(t), `Missing type: ${t}`))
})
