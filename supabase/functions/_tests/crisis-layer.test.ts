/**
 * Crisis layer integration tests — severity mapping, event structure,
 * and RPC payload validation for the upsert_crisis_event pipeline.
 *
 * These tests run without a live database or API — they validate the pure
 * logic used by safety-check/index.ts to classify severity and build payloads.
 *
 * Run with: deno test supabase/functions/_tests/crisis-layer.test.ts
 */

import {
  assertEquals,
  assertExists,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

type RiskLevel  = 'none' | 'low' | 'moderate' | 'high' | 'crisis'
type Severity   = 'critical' | 'high' | 'medium' | 'low'

interface CrisisEventPayload {
  p_user_id:       string
  p_entry_id:      string | null
  p_severity:      Severity
  p_trigger_phrase: string
  p_detected_tags: string[]
}

// ── Replicate severity mapping from safety-check/index.ts ────────────────────

function mapRiskToSeverity(riskLevel: RiskLevel, detectionMethod: string): Severity {
  if (riskLevel === 'crisis')                      return 'critical'
  if (detectionMethod === 'keyword_match')         return 'critical'
  if (detectionMethod === 'self_harm_moderation')  return 'critical'
  if (detectionMethod === 'other_moderation')      return 'high'
  if (riskLevel === 'high')                        return 'high'
  if (riskLevel === 'moderate')                    return 'medium'
  return 'low'
}

const VALID_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

function buildCrisisPayload(
  userId: string,
  entryId: string | null,
  riskLevel: RiskLevel,
  detectionMethod: string,
  triggerPhrase: string,
  tags: string[],
): CrisisEventPayload {
  return {
    p_user_id:        userId,
    p_entry_id:       entryId,
    p_severity:       mapRiskToSeverity(riskLevel, detectionMethod),
    p_trigger_phrase: triggerPhrase.slice(0, 500),  // truncate to DB constraint
    p_detected_tags:  tags.slice(0, 20),            // reasonable cap
  }
}

function shouldLogEvent(riskLevel: RiskLevel): boolean {
  return riskLevel !== 'none' && riskLevel !== 'low'
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('mapRiskToSeverity — crisis risk → critical', () => {
  assertEquals(mapRiskToSeverity('crisis', 'keyword_match'), 'critical')
  assertEquals(mapRiskToSeverity('crisis', 'claude_moderation'), 'critical')
})

Deno.test('mapRiskToSeverity — keyword_match → critical regardless of risk', () => {
  assertEquals(mapRiskToSeverity('moderate', 'keyword_match'), 'critical')
  assertEquals(mapRiskToSeverity('high', 'keyword_match'), 'critical')
})

Deno.test('mapRiskToSeverity — self_harm_moderation → critical', () => {
  assertEquals(mapRiskToSeverity('high', 'self_harm_moderation'), 'critical')
})

Deno.test('mapRiskToSeverity — other_moderation → high', () => {
  assertEquals(mapRiskToSeverity('moderate', 'other_moderation'), 'high')
})

Deno.test('mapRiskToSeverity — high risk → high', () => {
  assertEquals(mapRiskToSeverity('high', 'claude_analysis'), 'high')
})

Deno.test('mapRiskToSeverity — moderate risk → medium', () => {
  assertEquals(mapRiskToSeverity('moderate', 'claude_analysis'), 'medium')
})

Deno.test('mapRiskToSeverity — low / none → low', () => {
  assertEquals(mapRiskToSeverity('low', 'claude_analysis'), 'low')
  assertEquals(mapRiskToSeverity('none', 'claude_analysis'), 'low')
})

Deno.test('mapRiskToSeverity — all outputs are valid severity values', () => {
  const inputs: Array<[RiskLevel, string]> = [
    ['crisis', 'keyword_match'],
    ['high', 'self_harm_moderation'],
    ['high', 'other_moderation'],
    ['high', 'claude_analysis'],
    ['moderate', 'claude_analysis'],
    ['low', 'claude_analysis'],
    ['none', 'anything'],
  ]
  inputs.forEach(([risk, method]) => {
    const severity = mapRiskToSeverity(risk, method)
    assert(VALID_SEVERITIES.includes(severity), `Invalid severity: ${severity}`)
  })
})

Deno.test('shouldLogEvent — logs moderate and above', () => {
  assert(shouldLogEvent('crisis'))
  assert(shouldLogEvent('high'))
  assert(shouldLogEvent('moderate'))
})

Deno.test('shouldLogEvent — does not log none or low', () => {
  assertEquals(shouldLogEvent('none'), false)
  assertEquals(shouldLogEvent('low'), false)
})

Deno.test('buildCrisisPayload — builds valid payload', () => {
  const payload = buildCrisisPayload(
    'user-123',
    'entry-456',
    'crisis',
    'keyword_match',
    'I want to hurt myself',
    ['distress', 'self-harm'],
  )
  assertExists(payload)
  assertEquals(payload.p_user_id, 'user-123')
  assertEquals(payload.p_entry_id, 'entry-456')
  assertEquals(payload.p_severity, 'critical')
  assertEquals(payload.p_trigger_phrase, 'I want to hurt myself')
  assertExists(payload.p_detected_tags)
})

Deno.test('buildCrisisPayload — null entry_id is preserved', () => {
  const payload = buildCrisisPayload('user-1', null, 'moderate', 'claude_analysis', 'feeling low', [])
  assertEquals(payload.p_entry_id, null)
})

Deno.test('buildCrisisPayload — trigger_phrase truncated to 500 chars', () => {
  const longPhrase = 'x'.repeat(600)
  const payload = buildCrisisPayload('user-1', null, 'high', 'keyword_match', longPhrase, [])
  assertEquals(payload.p_trigger_phrase.length, 500)
})

Deno.test('buildCrisisPayload — tags capped at 20', () => {
  const tags = Array.from({ length: 30 }, (_, i) => `tag-${i}`)
  const payload = buildCrisisPayload('user-1', null, 'high', 'keyword_match', 'phrase', tags)
  assertEquals(payload.p_detected_tags.length, 20)
})

Deno.test('buildCrisisPayload — empty tags array is valid', () => {
  const payload = buildCrisisPayload('user-1', 'entry-1', 'moderate', 'claude_analysis', 'phrase', [])
  assertEquals(payload.p_detected_tags, [])
})
