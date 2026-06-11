/**
 * Self-contained Claude API utilities for Supabase Edge Functions.
 *
 * Deno-compatible — no @echo-self/* package imports.
 * All AI calls go through Supabase Edge Functions, never from frontend directly.
 */

// ── Types (inlined from @echo-self/shared-types) ──────────────────────────────

export type EmotionType =
  | 'joy' | 'sadness' | 'anger' | 'fear'
  | 'surprise' | 'disgust' | 'anticipation' | 'trust'
  | 'optimism' | 'love' | 'awe'

export interface EmotionAnalysis {
  emotion: EmotionType
  intensity: number              // 0.0–1.0
  secondaryEmotion: EmotionType | null
  valence: 'positive' | 'negative' | 'neutral'
  themes: string[]               // 3–5 key themes
  summarySentence: string
}

// ── Emotion analysis prompts ──────────────────────────────────────────────────

const EMOTION_SYSTEM_PROMPT = `You are an expert emotion analyst. Analyze the emotional content of journal entries with precision and nuance.

Respond ONLY with valid JSON matching this exact schema:
{
  "emotion": "joy" | "sadness" | "anger" | "fear" | "surprise" | "disgust" | "anticipation" | "trust" | "optimism" | "love" | "awe",
  "intensity": number between 0 and 1,
  "secondaryEmotion": same enum or null,
  "valence": "positive" | "negative" | "neutral",
  "themes": string[] (3-5 key themes),
  "summarySentence": string (one precise sentence describing the emotional state)
}

Guidelines:
- Use Plutchik's wheel: primary (joy, sadness, anger, fear, surprise, disgust, anticipation, trust) and compounds (optimism = joy+anticipation, love = joy+trust, awe = fear+surprise)
- Intensity 0.0 = barely present, 1.0 = overwhelming
- Themes should be concrete and specific to the text, not generic
- Summary sentence should be precise and emotionally resonant`

// ── analyzeEmotion ────────────────────────────────────────────────────────────

/**
 * Analyzes the emotion of a journal entry using Claude Haiku.
 * Claude Haiku is used for classification tasks (fast, cheap, accurate).
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
        content: `Analyze the emotion in this journal entry:\n\n${content}`,
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  const raw  = data.content?.[0]?.text ?? '{}'

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Claude emotion response')

  return JSON.parse(match[0]) as EmotionAnalysis
}

// ── Generic Claude call helper ────────────────────────────────────────────────

export async function callClaude(
  anthropicApiKey: string,
  model: string,
  system: string,
  userMsg: string,
  maxTokens = 600,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}
