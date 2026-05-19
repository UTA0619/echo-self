# OpenAI Integration Plan — ECHO//SELF

---

## API Configuration

```typescript
// src/lib/ai/openai.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  maxRetries: 3,
  timeout: 30_000,
})
```

---

## Models Used

| Model | Usage | Cost | Fallback |
|---|---|---|---|
| `gpt-4o` | Echo sessions, memory extraction, identity, future self | $5/1M input, $15/1M output | gpt-4o-mini (degraded quality) |
| `gpt-4o-mini` | Emotion analysis, daily insights, notification copy | $0.15/1M input, $0.60/1M output | Static fallback response |
| `text-embedding-3-large` | Memory + entry embeddings (3072 dim) | $0.13/1M tokens | Cache hit, then queue retry |
| `whisper-1` | Voice-to-text transcription | $0.006/min audio | None (manual text entry) |

---

## Rate Limiting

```typescript
// src/lib/ai/rate-limiter.ts
// User-level rate limits to control costs
const AI_RATE_LIMITS = {
  'echo-session': { rpm: 10, daily: 30 },      // per user
  'emotion-analysis': { rpm: 30, daily: 200 }, // per user
  'embedding': { rpm: 50, daily: 500 },         // per user
  'whisper': { rpm: 5, daily: 20 },             // per user
}
```

---

## Structured Outputs

All AI responses use JSON schema enforcement where possible:

```typescript
// Emotion analysis with strict JSON
const response = await openai.beta.chat.completions.parse({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'emotion_analysis',
      strict: true,
      schema: EmotionAnalysisSchema,
    },
  },
})
const emotion = response.choices[0].message.parsed
```

---

## Streaming (Echo Sessions)

```typescript
// Edge function streaming to client
export async function POST(req: Request) {
  const { message, sessionId } = await req.json()
  const context = await buildEchoContext(sessionId)

  const openaiStream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: buildMessages(context, message),
    stream: true,
    max_tokens: 400,
    temperature: 0.85,
  })

  // Convert to SSE stream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiStream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## Content Moderation

Run before every AI processing call:

```typescript
// src/lib/ai/moderation.ts
export async function moderateContent(text: string): Promise<boolean> {
  const response = await openai.moderations.create({ input: text })
  const result = response.results[0]

  if (result.flagged) {
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, v]) => v)
      .map(([k]) => k)

    console.warn('Content flagged:', flaggedCategories)

    // Only hard-block self-harm and violence/graphic
    const hardBlock = ['self_harm', 'violence/graphic']
    if (flaggedCategories.some(c => hardBlock.includes(c))) {
      return false  // block processing
    }
  }

  return true  // safe to process
}
```

### Crisis Response

```typescript
const CRISIS_PHRASES = [
  'want to die', 'kill myself', 'end it all', 'no reason to live',
  'suicidal', 'can\'t go on'
]

function detectCrisis(text: string): boolean {
  return CRISIS_PHRASES.some(phrase =>
    text.toLowerCase().includes(phrase)
  )
}

// If crisis detected, return compassionate response + resources
// NEVER route to AI generation for crisis content
const CRISIS_RESPONSE = `I noticed something heavy in what you wrote. You matter, and you don't have to go through this alone.

If you're having thoughts of ending your life, please reach out:
• Crisis Text Line: Text HOME to 741741
• National Suicide Prevention Lifeline: 988
• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/`
```

---

## Error Handling & Fallbacks

```typescript
// src/lib/ai/with-fallback.ts
export async function withAIFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        // Rate limited — queue for retry
        await queueForRetry(context)
      } else if (error.status >= 500) {
        // OpenAI down — use fallback silently
      } else {
        // Client error — log for debugging
        Sentry.captureException(error, { extra: { context } })
      }
    }
    return fallback
  }
}
```

---

## Cost Controls

- Daily budget alert: $50/day total → Sentry alert + Slack
- Per-user monthly spend cap: $8 (enforce at rate limiter level)
- Embedding cache: SHA-256 hash → Vercel KV, 24h TTL (target 40% hit rate)
- Batch embeddings: always group ≥ 5 texts before API call
- Use `gpt-4o-mini` for any non-conversational task
