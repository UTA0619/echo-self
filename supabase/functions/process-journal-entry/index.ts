/**
 * process-journal-entry — Post-save processing pipeline for journal entries.
 *
 * Triggered after an entry is saved. Runs in parallel:
 *  1. Emotion analysis (Claude Haiku)
 *  2. Memory extraction (Claude Haiku)
 *  3. Embed extracted memories (OpenAI text-embedding-3-large — must stay OpenAI
 *     to remain compatible with existing pgvector data at dimension 3072)
 *
 * NOTE: This function handles older trigger-based invocations. The primary
 * pipeline for new entries runs through echo-ai + memory-ingest + emotion-analyze
 * edge functions. This function is kept for backward compatibility.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const OPENAI_API_KEY    = Deno.env.get('OPENAI_API_KEY')!  // required for embeddings only

const EMBEDDING_MODEL      = 'text-embedding-3-large'
const EMBEDDING_DIMENSIONS = 3072

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callHaiku(system: string, userMsg: string, maxTokens = 512): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error: ${res.status}`)
  const json = await res.json() as { content: Array<{ text: string }> }
  return json.content?.[0]?.text ?? ''
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, dimensions: EMBEDDING_DIMENSIONS }),
  })
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`)
  const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> }
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
}

// ── Emotion Analysis ──────────────────────────────────────────────────────────

async function analyzeEmotion(text: string) {
  const raw = await callHaiku(
    `You are an expert emotion analyst. Analyze journal entry emotional content.
Output ONLY valid JSON:
{
  "primary": { "emotion": "joy|trust|fear|surprise|sadness|disgust|anger|anticipation", "intensity": 0.0-1.0 },
  "secondary": [{ "emotion": string, "intensity": 0.0-1.0 }],
  "valence": -1.0 to 1.0,
  "arousal": 0.0 to 1.0,
  "themes": ["theme1", "theme2"],
  "trigger_signals": ["signal1"]
}`,
    `Analyze this journal entry:\n\n${text.slice(0, 2000)}`,
    300,
  )

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  }
}

// ── Memory Extraction ─────────────────────────────────────────────────────────

interface MemoryItem {
  content: string
  type: string
  confidence: number
  emotion: string
  tags: string[]
}

async function extractMemories(text: string): Promise<MemoryItem[]> {
  const raw = await callHaiku(
    `Extract 3-7 atomic memories from journal entries. Each memory is one self-contained fact about the person.
Output ONLY valid JSON:
{"memories": [{"content": string, "type": "belief|value|core_fear|core_desire|behavioral_pattern|relationship_pattern|strength|event", "confidence": 0.0-1.0, "emotion": string, "tags": [string]}]}
Write in third person. Don't extract trivial facts.`,
    `Extract memories from this entry:\n\n${text.slice(0, 3000)}`,
    800,
  )

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as { memories?: MemoryItem[] }
    return parsed.memories ?? []
  } catch {
    return []
  }
}

// ── Crisis Detection ──────────────────────────────────────────────────────────

const CRISIS_PHRASES = [
  'want to die', 'kill myself', 'end it all', 'no reason to live', 'suicidal', "can't go on",
]

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_PHRASES.some(p => lower.includes(p))
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  const start = Date.now()

  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })

    const { entryId, userId } = await req.json()
    if (!entryId || !userId) return new Response('Missing entryId or userId', { status: 400 })

    const supabase = getServiceClient()

    // Fetch from entries table (current schema)
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, content, user_id')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single()

    if (entryError || !entry) return new Response('Entry not found', { status: 404 })

    const text = entry.content
    console.log(JSON.stringify({ msg: 'processing_start', entryId, userId, words: text.split(' ').length }))

    if (hasCrisisContent(text)) {
      console.log(JSON.stringify({ msg: 'crisis_detected', entryId }))
      await supabase.from('entries').update({ ai_processed: true }).eq('id', entryId)
      return Response.json({ ok: true, crisis: true })
    }

    const [emotions, rawMemories] = await Promise.all([
      analyzeEmotion(text),
      extractMemories(text),
    ])

    // Embed all memories in one batch
    const memoryTexts = rawMemories.map(m => m.content)
    const embeddings  = memoryTexts.length > 0 ? await embedTexts(memoryTexts) : []

    const memoryInserts = rawMemories.map((memory, i) => ({
      user_id:         userId,
      content_chunk:   memory.content,
      embedding:       embeddings[i] ? JSON.stringify(embeddings[i]) : null,
      source_entry_id: entryId,
    }))

    if (memoryInserts.length > 0) {
      const { error: memErr } = await supabase.from('memories').insert(memoryInserts)
      if (memErr) console.error('[process-entry] memory insert error:', memErr.message)
    }

    await supabase.from('entries').update({
      emotion:      emotions?.primary?.emotion ?? null,
      ai_processed: true,
    }).eq('id', entryId)

    console.log(JSON.stringify({
      msg: 'processing_complete', entryId,
      emotionPrimary: emotions?.primary?.emotion,
      memoriesExtracted: memoryInserts.length,
      ms: Date.now() - start,
    }))

    return Response.json({ ok: true, emotions, memoriesExtracted: memoryInserts.length })
  } catch (err) {
    console.error(JSON.stringify({
      msg: 'processing_error',
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    }))
    return new Response('Internal error', { status: 500 })
  }
})
