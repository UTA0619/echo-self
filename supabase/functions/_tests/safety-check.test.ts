/**
 * Unit tests for safety-check crisis signal detection logic.
 *
 * Tests the keyword pre-check without making real API calls.
 *
 * Run with: deno test supabase/functions/_tests/safety-check.test.ts
 */

import { assertEquals, assertArrayIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Replicated from safety-check/index.ts ────────────────────────────────────

const CRISIS_SIGNALS = [
  'kill myself', 'end my life', 'want to die', 'suicidal', 'suicide',
  'self-harm', 'cut myself', 'hurt myself', 'not worth living',
  'no reason to live', 'better off dead', 'overdose',
]

function hasCrisisSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_SIGNALS.some(signal => lower.includes(signal))
}

type RiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'crisis'

function preClassify(text: string): RiskLevel {
  if (hasCrisisSignal(text)) return 'crisis'
  return 'none'
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('hasCrisisSignal — detects explicit signals', () => {
  assertEquals(hasCrisisSignal("I want to kill myself"), true)
  assertEquals(hasCrisisSignal("I've been suicidal"), true)
  assertEquals(hasCrisisSignal("thinking about suicide"), true)
  assertEquals(hasCrisisSignal("I feel like ending my life"), true)
  assertEquals(hasCrisisSignal("I want to overdose"), true)
})

Deno.test('hasCrisisSignal — case-insensitive', () => {
  assertEquals(hasCrisisSignal("I WANT TO DIE"), true)
  assertEquals(hasCrisisSignal("SUICIDAL"), true)
  assertEquals(hasCrisisSignal("Better Off Dead"), true)
})

Deno.test('hasCrisisSignal — false negatives on safe text', () => {
  assertEquals(hasCrisisSignal("I'm feeling really happy today"), false)
  assertEquals(hasCrisisSignal("Work was stressful but I managed"), false)
  assertEquals(hasCrisisSignal("I killed it at the presentation"), false)
  assertEquals(hasCrisisSignal("Dying to go on vacation"), false)
  assertEquals(hasCrisisSignal("This traffic is killing me"), false)
})

Deno.test('hasCrisisSignal — returns false for empty string', () => {
  assertEquals(hasCrisisSignal(""), false)
})

Deno.test('preClassify — returns crisis for dangerous content', () => {
  assertEquals(preClassify("I don't want to live anymore"), 'crisis')
  assertEquals(preClassify("I hurt myself last night"), 'crisis')
})

Deno.test('preClassify — returns none for safe content', () => {
  assertEquals(preClassify("Had a great workout today"), 'none')
  assertEquals(preClassify("Feeling anxious about my interview"), 'none')
})

Deno.test('CRISIS_SIGNALS — no duplicates', () => {
  const unique = new Set(CRISIS_SIGNALS)
  assertEquals(unique.size, CRISIS_SIGNALS.length)
})

Deno.test('CRISIS_SIGNALS — all lowercase for case-insensitive matching', () => {
  CRISIS_SIGNALS.forEach(signal => {
    assertEquals(signal, signal.toLowerCase())
  })
})
