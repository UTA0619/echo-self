import type { EmotionAnalysis } from '@echo-self/shared-types'
import { EMOTION_SYSTEM_PROMPT, buildEmotionUserPrompt } from '../prompts/emotion.js'

/**
 * Analyzes the emotion of a journal entry using Claude Haiku.
 *
 * Claude Haiku is used for classification tasks (fast, cheap, accurate).
 * Embeddings remain on OpenAI text-embedding-3-large — changing the embedding
 * model would invalidate all existing pgvector data in the database.
 *
 * @param anthropicApiKey — ANTHROPIC_API_KEY env var
 * @param content         — journal entry text
 */
export async function analyzeEmotion(
  anthropicApiKey: string,
  content: string,
): Promise<EmotionAnalysis> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     EMOTION_SYSTEM_PROMPT,
      messages: [{
        role:    'user',
        content: buildEmotionUserPrompt(content),
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  const raw  = data.content?.[0]?.text ?? '{}'

  // Claude may wrap JSON in prose — extract the first JSON object
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Claude emotion response')

  const result = JSON.parse(match[0]) as EmotionAnalysis
  return result
}
