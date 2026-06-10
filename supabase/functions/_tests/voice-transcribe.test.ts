/**
 * Unit tests for voice-transcribe edge function logic.
 *
 * Tests the base64 decoding, mime-type → extension mapping, and
 * response shaping without making real HTTP calls to OpenAI.
 *
 * Run with: deno test --allow-none supabase/functions/_tests/voice-transcribe.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

// ── Helpers extracted from the edge function ────────────────────────────────

function mimeToExt(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  return 'm4a'
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ── Tests ────────────────────────────────────────────────────────────────────

Deno.test('mimeToExt — webm', () => {
  assertEquals(mimeToExt('audio/webm'), 'webm')
  assertEquals(mimeToExt('audio/webm;codecs=opus'), 'webm')
})

Deno.test('mimeToExt — m4a / mp4', () => {
  assertEquals(mimeToExt('audio/m4a'), 'm4a')
  assertEquals(mimeToExt('audio/mp4'), 'm4a')
})

Deno.test('mimeToExt — wav', () => {
  assertEquals(mimeToExt('audio/wav'), 'wav')
  assertEquals(mimeToExt('audio/x-wav'), 'wav')
})

Deno.test('mimeToExt — ogg', () => {
  assertEquals(mimeToExt('audio/ogg'), 'ogg')
})

Deno.test('mimeToExt — unknown defaults to m4a', () => {
  assertEquals(mimeToExt('audio/unknown'), 'm4a')
  assertEquals(mimeToExt(''), 'm4a')
})

Deno.test('decodeBase64 — round-trips correctly', () => {
  const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
  const b64 = btoa(String.fromCharCode(...original))
  const decoded = decodeBase64(b64)
  assertEquals(decoded, original)
})

Deno.test('decodeBase64 — handles empty string', () => {
  const decoded = decodeBase64(btoa(''))
  assertEquals(decoded.length, 0)
})

Deno.test('transcript trimming', () => {
  // Simulate what the function does with the Whisper response
  const rawText = '  Hello, world!  \n'
  const transcript = rawText?.trim() ?? ''
  assertEquals(transcript, 'Hello, world!')
})
