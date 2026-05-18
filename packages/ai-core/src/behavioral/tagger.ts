import { anthropic } from '../orchestrator'
import { loadPrompt } from '../prompts/loader'
import type { BehavioralTag, TagCategory, TagValence } from '@echo/shared'

interface RawTag {
  name: string
  category: TagCategory
  valence: TagValence
  intensity: number
}

export async function tagMemoryBehavior(
  memoryContent: string,
  memoryId: string,
  userId: string
): Promise<Omit<BehavioralTag, 'id' | 'createdAt'>[]> {
  const prompt = loadPrompt('behavioral-tagger', {})

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: prompt.system,
    messages: [{ role: 'user', content: memoryContent }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return []

  let tags: RawTag[] = []
  try {
    const parsed = JSON.parse(block.text)
    tags = parsed.tags ?? []
  } catch {
    return []
  }

  return tags.map((t) => ({
    memoryId,
    userId,
    tagName: t.name,
    tagCategory: t.category,
    valence: t.valence,
    intensity: Math.min(1, Math.max(0, t.intensity)),
  }))
}
