// ECHO//SELF — Edge Function: process-journal-entry
// Triggered after a journal entry is saved.
// Runs: emotion analysis → memory extraction → embedding → broadcast

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
})

const EMBEDDING_MODEL = 'text-embedding-3-large'
const CHAT_MODEL_FAST = 'gpt-4o-mini'
const CHAT_MODEL_QUALITY = 'gpt-4o'

// ── Emotion Analysis ────────────────────────────────────────────────────────

async function analyzeEmotion(text: string) {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL_FAST,
    max_tokens: 256,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Analyze the emotional content of this journal entry.
Return ONLY valid JSON:
{
  "primary": { "emotion": string, "intensity": number },
  "secondary": [{ "emotion": string, "intensity": number }],
  "valence": number,
  "arousal": number,
  "themes": string[],
  "trigger_signals": string[]
}
Emotions: joy, trust, fear, surprise, sadness, disgust, anger, anticipation.
Intensity and valence: -1.0 to 1.0. Arousal: 0.0 to 1.0.

Entry: """${text.slice(0, 2000)}"""`,
    }],
  })

  try {
    return JSON.parse(response.choices[0].message.content!)
  } catch {
    return { primary: { emotion: 'neutral', intensity: 0.5 }, secondary: [], valence: 0, arousal: 0.5, themes: [], trigger_signals: [] }
  }
}

// ── Memory Extraction ───────────────────────────────────────────────────────

async function extractMemories(text: string): Promise<Array<{
  content: string; type: string; confidence: number; emotion: string; tags: string[]
}>> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL_QUALITY,
    max_tokens: 1024,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Extract 3-7 atomic memories from this journal entry.
Each memory is one self-contained fact about the person: beliefs, values, fears, desires, patterns, relationships.
Return ONLY valid JSON:
{
  "memories": [
    {
      "content": "Complete sentence about one fact about the person",
      "type": "belief|value|core_fear|core_desire|behavioral_pattern|relationship_pattern|strength|event",
      "confidence": 0.0-1.0,
      "emotion": "primary emotion",
      "tags": ["tag1", "tag2"]
    }
  ]
}
Write in third person. High confidence = explicit/repeated. Don't extract trivial facts.

Entry: """${text.slice(0, 3000)}"""`,
    }],
  })

  try {
    const parsed = JSON.parse(response.choices[0].message.content!)
    return parsed.memories ?? []
  } catch {
    return []
  }
}

// ── Embedding ───────────────────────────────────────────────────────────────

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: 3072,
  })

  return response.data.map(d => d.embedding)
}

// ── Crisis Detection ────────────────────────────────────────────────────────

const CRISIS_PHRASES = ['want to die', 'kill myself', 'end it all', 'no reason to live', 'suicidal', "can't go on"]

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_PHRASES.some(phrase => lower.includes(phrase))
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const start = Date.now()

  try {
    // Validate request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { entryId, userId } = await req.json()
    if (!entryId || !userId) {
      return new Response('Missing entryId or userId', { status: 400 })
    }

    // Fetch entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('id, content, user_id')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single()

    if (entryError || !entry) {
      return new Response('Entry not found', { status: 404 })
    }

    const text = entry.content
    console.log(JSON.stringify({ msg: 'processing_start', entryId, userId, words: text.split(' ').length }))

    // Skip crisis content — use static response
    if (hasCrisisContent(text)) {
      console.log(JSON.stringify({ msg: 'crisis_detected', entryId }))
      await supabase.from('journal_entries').update({
        emotions: { primary: { emotion: 'fear', intensity: 0.9 }, crisis_detected: true },
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
      }).eq('id', entryId)

      return Response.json({ ok: true, crisis: true })
    }

    // Run emotion analysis and memory extraction in parallel
    const [emotions, rawMemories] = await Promise.all([
      analyzeEmotion(text),
      extractMemories(text),
    ])

    // Embed all memory texts in one batch call
    const memoryTexts = rawMemories.map(m => m.content)
    const embeddings = memoryTexts.length > 0 ? await embedTexts(memoryTexts) : []

    // Store memories
    const memoryInserts = rawMemories.map((memory, i) => ({
      user_id: userId,
      content: memory.content,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
      type: memory.type,
      emotion: memory.emotion,
      confidence: memory.confidence,
      tags: memory.tags,
      source_entry_id: entryId,
    }))

    if (memoryInserts.length > 0) {
      const { error: memError } = await supabase
        .from('memories')
        .insert(memoryInserts)

      if (memError) {
        console.error(JSON.stringify({ msg: 'memory_insert_error', error: memError.message }))
      }
    }

    // Update entry with emotions + mark processed
    await supabase.from('journal_entries').update({
      emotions,
      ai_processed: true,
      ai_processed_at: new Date().toISOString(),
    }).eq('id', entryId)

    // Broadcast emotion update via Realtime
    await supabase.channel(`user:${userId}:processing`).send({
      type: 'broadcast',
      event: 'emotion-update',
      payload: { entryId, emotions, memoriesExtracted: memoryInserts.length },
    })

    console.log(JSON.stringify({
      msg: 'processing_complete',
      entryId,
      emotionPrimary: emotions.primary?.emotion,
      memoriesExtracted: memoryInserts.length,
      ms: Date.now() - start,
    }))

    return Response.json({
      ok: true,
      emotions,
      memoriesExtracted: memoryInserts.length,
    })

  } catch (err) {
    console.error(JSON.stringify({
      msg: 'processing_error',
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    }))

    return new Response('Internal error', { status: 500 })
  }
})
