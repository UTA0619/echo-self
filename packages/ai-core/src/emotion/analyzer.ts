import type { EmotionAnalysis } from '@echo-self/shared-types'
import { EMOTION_SYSTEM_PROMPT, buildEmotionUserPrompt } from '../prompts/emotion.js'

export async function analyzeEmotion(
  openaiApiKey: string,
  content: string,
): Promise<EmotionAnalysis> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: EMOTION_SYSTEM_PROMPT },
        { role: 'user', content: buildEmotionUserPrompt(content) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const result = JSON.parse(data.choices[0]?.message?.content ?? '{}') as EmotionAnalysis

  return result
}
