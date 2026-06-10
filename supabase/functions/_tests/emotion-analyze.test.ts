/**
 * Unit tests for emotion analysis output parsing and validation.
 *
 * Tests the JSON extraction and schema validation that wraps the Claude Haiku
 * response — no live API calls required.
 *
 * Run with: deno test supabase/functions/_tests/emotion-analyze.test.ts
 */

import {
  assertEquals,
  assert,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Types (mirrored from @echo-self/shared-types) ─────────────────────────────

interface EmotionAnalysis {
  emotion:          string
  intensity:        number
  secondaryEmotion: string | null
  valence:          'positive' | 'negative' | 'neutral'
  themes:           string[]
  summarySentence:  string
}

// ── Replicate parsing logic from packages/ai-core/src/emotion/analyzer.ts ─────

function parseEmotionResponse(raw: string): EmotionAnalysis | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as EmotionAnalysis
  } catch {
    return null
  }
}

function validateEmotionAnalysis(data: EmotionAnalysis): string[] {
  const errors: string[] = []
  const VALID_EMOTIONS = new Set([
    'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
    'anticipation', 'trust', 'optimism', 'love', 'awe', 'neutral',
  ])
  const VALID_VALENCES = new Set(['positive', 'negative', 'neutral'])

  if (!VALID_EMOTIONS.has(data.emotion?.toLowerCase()))
    errors.push(`Invalid emotion: ${data.emotion}`)
  if (typeof data.intensity !== 'number' || data.intensity < 0 || data.intensity > 1)
    errors.push(`Invalid intensity: ${data.intensity}`)
  if (data.secondaryEmotion !== null && !VALID_EMOTIONS.has(data.secondaryEmotion?.toLowerCase()))
    errors.push(`Invalid secondaryEmotion: ${data.secondaryEmotion}`)
  if (!VALID_VALENCES.has(data.valence))
    errors.push(`Invalid valence: ${data.valence}`)
  if (!Array.isArray(data.themes))
    errors.push('themes must be an array')
  if (typeof data.summarySentence !== 'string')
    errors.push('summarySentence must be a string')

  return errors
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('parseEmotionResponse — extracts valid JSON from clean response', () => {
  const raw = `{"emotion":"joy","intensity":0.85,"secondaryEmotion":"trust","valence":"positive","themes":["growth","connection"],"summarySentence":"The user feels joyful."}`
  const result = parseEmotionResponse(raw)
  assertExists(result)
  assertEquals(result.emotion, 'joy')
  assertEquals(result.intensity, 0.85)
})

Deno.test('parseEmotionResponse — handles prose wrapper from Claude', () => {
  const raw = `Here is the emotion analysis:\n{"emotion":"sadness","intensity":0.6,"secondaryEmotion":null,"valence":"negative","themes":["loss"],"summarySentence":"User feels sad."}\nHope this helps.`
  const result = parseEmotionResponse(raw)
  assertExists(result)
  assertEquals(result.emotion, 'sadness')
})

Deno.test('parseEmotionResponse — returns null for non-JSON', () => {
  assertEquals(parseEmotionResponse('The emotion is joy'), null)
  assertEquals(parseEmotionResponse(''), null)
})

Deno.test('parseEmotionResponse — returns null for malformed JSON', () => {
  assertEquals(parseEmotionResponse('{bad json}'), null)
})

Deno.test('validateEmotionAnalysis — passes for valid analysis', () => {
  const data: EmotionAnalysis = {
    emotion:          'joy',
    intensity:        0.8,
    secondaryEmotion: null,
    valence:          'positive',
    themes:           ['happiness', 'success'],
    summarySentence:  'The user feels joyful and accomplished.',
  }
  assertEquals(validateEmotionAnalysis(data), [])
})

Deno.test('validateEmotionAnalysis — catches invalid emotion', () => {
  const data: EmotionAnalysis = {
    emotion: 'happiness',  // not in taxonomy
    intensity: 0.5,
    secondaryEmotion: null,
    valence: 'positive',
    themes: [],
    summarySentence: 'Test.',
  }
  const errors = validateEmotionAnalysis(data)
  assert(errors.some(e => e.includes('emotion')))
})

Deno.test('validateEmotionAnalysis — catches out-of-range intensity', () => {
  const data: EmotionAnalysis = {
    emotion: 'joy',
    intensity: 1.5,  // > 1
    secondaryEmotion: null,
    valence: 'positive',
    themes: [],
    summarySentence: 'Test.',
  }
  const errors = validateEmotionAnalysis(data)
  assert(errors.some(e => e.includes('intensity')))
})

Deno.test('validateEmotionAnalysis — catches invalid valence', () => {
  const data: EmotionAnalysis = {
    emotion: 'joy',
    intensity: 0.7,
    secondaryEmotion: null,
    valence: 'good' as 'positive',  // invalid
    themes: [],
    summarySentence: 'Test.',
  }
  const errors = validateEmotionAnalysis(data)
  assert(errors.some(e => e.includes('valence')))
})

Deno.test('validateEmotionAnalysis — accepts all valid primary emotions', () => {
  const validEmotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'anticipation', 'trust', 'optimism', 'love', 'awe', 'neutral']
  for (const emotion of validEmotions) {
    const data: EmotionAnalysis = {
      emotion,
      intensity: 0.5,
      secondaryEmotion: null,
      valence: 'neutral',
      themes: [],
      summarySentence: 'Test.',
    }
    assertEquals(validateEmotionAnalysis(data), [], `${emotion} should be valid`)
  }
})

Deno.test('validateEmotionAnalysis — accepts null secondaryEmotion', () => {
  const data: EmotionAnalysis = {
    emotion: 'joy',
    intensity: 0.7,
    secondaryEmotion: null,
    valence: 'positive',
    themes: ['success'],
    summarySentence: 'User feels joy.',
  }
  assertEquals(validateEmotionAnalysis(data), [])
})
