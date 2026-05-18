import { anthropic } from '../orchestrator'
import type { PrimaryEmotion } from '@echo/shared'

interface EmotionResult {
  emotionPrimary: PrimaryEmotion
  emotionSecondary?: string
  valence: number
  arousal: number
}

const SYSTEM_PROMPT = `You are an emotion classifier. Analyze the text and return JSON with:
- emotionPrimary: one of joy|fear|anger|sadness|surprise|disgust|anticipation|trust
- emotionSecondary: optional secondary emotion string
- valence: float -1.0 (very negative) to 1.0 (very positive)
- arousal: float 0.0 (calm) to 1.0 (intense)
Return ONLY valid JSON, no explanation.`

export async function classifyEmotion(memoryContent: string): Promise<EmotionResult | null> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: memoryContent }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return null

  try {
    return JSON.parse(block.text) as EmotionResult
  } catch {
    return null
  }
}
