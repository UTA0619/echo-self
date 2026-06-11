/**
 * _shared/embeddings.ts
 *
 * Text chunking and embedding utilities for Supabase Edge Functions.
 * Self-contained (no imports from monorepo packages) so it works in
 * Supabase's Deno deployment environment.
 *
 * Embeddings use OpenAI text-embedding-3-large (3072 dims).
 * DO NOT change the model — doing so invalidates all stored vectors.
 */

export const EMBEDDING_MODEL      = 'text-embedding-3-large'
export const EMBEDDING_DIMENSIONS = 3072
export const CHUNK_SIZE_CHARS     = 2048  // ≈ 512 tokens
export const CHUNK_OVERLAP_CHARS  = 200

// ── Text chunking ─────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks suitable for embedding.
 * Tries to break at sentence boundaries where possible.
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE_CHARS, overlap = CHUNK_OVERLAP_CHARS): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)

    // Try to break at a sentence boundary (. ! ?) if not at the very end
    if (end < text.length) {
      const lastPeriod = Math.max(
        text.lastIndexOf('. ', end),
        text.lastIndexOf('! ', end),
        text.lastIndexOf('? ', end),
      )
      if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1
      }
    }

    chunks.push(text.slice(start, end).trim())
    if (end >= text.length) break
    start = end - overlap
  }

  return chunks.filter(c => c.length > 20)
}

// ── Embeddings ────────────────────────────────────────────────────────────────

/**
 * Embed a single string using OpenAI text-embedding-3-large.
 */
export async function generateEmbedding(
  openaiApiKey: string,
  text: string,
): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:      EMBEDDING_MODEL,
      input:      text.slice(0, 8000), // max input length safety
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embedding error ${res.status}: ${err}`)
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> }
  return data.data[0]!.embedding
}

/**
 * Embed multiple strings in one batched API call (max 2048 inputs per call).
 */
export async function generateEmbeddings(
  openaiApiKey: string,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return []

  // OpenAI allows up to 2048 inputs per request
  const MAX_BATCH = 100  // use a safe batch size

  const results: number[][] = []

  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH).map(t => t.slice(0, 8000))

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:      EMBEDDING_MODEL,
        input:      batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI batch embedding error ${res.status}: ${err}`)
    }

    const data = await res.json() as { data: Array<{ index: number; embedding: number[] }> }
    // OpenAI returns results sorted by index
    data.data.sort((a, b) => a.index - b.index)
    results.push(...data.data.map(d => d.embedding))
  }

  return results
}

// ── Importance scoring ────────────────────────────────────────────────────────

interface ImportanceInput {
  emotionScore:    number | null   // 0–1
  wordCount:       number
  daysSinceEntry:  number          // 0 = today
  accessFrequency: number          // times retrieved from memory store
  userRating:      number | null   // 1–5 star rating or null
}

/**
 * Compute a 0–1 importance score for a memory chunk.
 * Higher values → more likely to be retrieved in semantic search.
 */
export function calculateImportanceScore({
  emotionScore,
  wordCount,
  daysSinceEntry,
  accessFrequency,
  userRating,
}: ImportanceInput): number {
  // Emotional weight (35%)
  const emotionWeight = (emotionScore ?? 0.5) * 0.35

  // Recency (25%) — decays over 365 days
  const recency = Math.max(0, 1 - daysSinceEntry / 365) * 0.25

  // Length bonus (15%) — longer entries tend to be more significant
  const lengthFactor = Math.min(wordCount / 500, 1) * 0.15

  // Access frequency (15%) — memories retrieved often are valuable
  const accessFactor = Math.min(accessFrequency / 10, 1) * 0.15

  // User rating (10%)
  const ratingFactor = userRating != null ? (userRating / 5) * 0.10 : 0.05

  const score = emotionWeight + recency + lengthFactor + accessFactor + ratingFactor

  return Math.max(0, Math.min(1, score))
}

/**
 * Serialize a vector to Postgres vector literal format for pgvector.
 */
export function serializeVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
