import { openai } from '../orchestrator'
import type { MemoryIngestionInput } from '@echo/shared'

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

export async function moderateContent(text: string): Promise<boolean> {
  const response = await openai.moderations.create({ input: text })
  return !response.results[0].flagged
}

export async function processMemoryInput(input: MemoryIngestionInput): Promise<{
  embedding: number[]
  isSafe: boolean
}> {
  const [embedding, isSafe] = await Promise.all([
    embedText(input.content),
    moderateContent(input.content),
  ])
  return { embedding, isSafe }
}
