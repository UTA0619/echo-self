export const EMBEDDING_MODEL = 'text-embedding-3-large'
export const EMBEDDING_DIMENSIONS = 3072
export const CHUNK_SIZE_TOKENS = 512
export const CHUNK_OVERLAP_TOKENS = 50

export function chunkText(text: string, chunkSize = CHUNK_SIZE_TOKENS, overlap = CHUNK_OVERLAP_TOKENS): string[] {
  // Approximate tokenization: 1 token ≈ 4 chars
  const chunkChars = chunkSize * 4
  const overlapChars = overlap * 4

  if (text.length <= chunkChars) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
    start = end - overlapChars
  }

  return chunks
}

export async function generateEmbedding(
  openaiApiKey: string,
  text: string,
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { data: Array<{ embedding: number[] }> }
  const embedding = data.data[0]?.embedding
  if (!embedding) throw new Error('No embedding returned')
  return embedding
}

export async function generateEmbeddings(
  openaiApiKey: string,
  texts: string[],
): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`)

  const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> }
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
}

export function calculateImportanceScore(params: {
  emotionScore: number | null
  wordCount: number
  daysSinceEntry: number
  accessFrequency: number
  userRating: -1 | 1 | null
}): number {
  const { emotionScore, wordCount, daysSinceEntry, accessFrequency, userRating } = params

  let score = 0.5
  score += (emotionScore ?? 0.5) * 0.3
  score += Math.min(wordCount / 500, 1) * 0.1
  score -= daysSinceEntry * 0.002
  score += Math.min(accessFrequency / 10, 1) * 0.1
  score += userRating === 1 ? 0.1 : 0

  return Math.min(1, Math.max(0, score))
}
