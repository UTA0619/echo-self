/**
 * behavioral-tag: Extract behavioral signals from a journal entry using Claude Haiku.
 * Stores tags in entries.tags[] column (TEXT[]).
 *
 * Input: { entry_id, user_id, content }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

// Controlled taxonomy — keeps tags consistent across users
const BEHAVIORAL_TAXONOMY = {
  cognitive: [
    'overthinking', 'analysis-paralysis', 'clarity', 'flow-state',
    'problem-solving', 'creative-thinking', 'learning', 'confusion',
  ],
  emotional: [
    'avoidance', 'emotional-flooding', 'self-compassion', 'resilience',
    'vulnerability', 'emotional-regulation', 'gratitude', 'grief',
  ],
  relational: [
    'conflict', 'connection', 'boundary-setting', 'people-pleasing',
    'isolation', 'intimacy', 'trust', 'comparison',
  ],
  energy: [
    'procrastination', 'momentum', 'burnout', 'motivation', 'rest',
    'distraction', 'discipline', 'overwhelm',
  ],
  growth: [
    'self-sabotage', 'breakthrough', 'habit-formation', 'reflection',
    'goal-setting', 'risk-taking', 'perfectionism', 'acceptance',
  ],
}

const ALL_TAGS = Object.values(BEHAVIORAL_TAXONOMY).flat()

interface BehavioralTag {
  tag: string
  category: string
  valence: 'positive' | 'negative' | 'neutral'
  intensity: number
}

async function extractBehavioralTags(content: string): Promise<BehavioralTag[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: `You are a behavioral psychologist tagging journal entries.
Extract behavioral tags from the taxonomy below. Return JSON array only.

TAXONOMY: ${JSON.stringify(BEHAVIORAL_TAXONOMY)}

Each tag object: { tag, category, valence: "positive"|"negative"|"neutral", intensity: 0.0-1.0 }
Rules:
- Max 6 tags per entry
- Only use tags from the taxonomy above
- intensity >= 0.4 required
- Return ONLY valid JSON array, no markdown`,
      messages: [{ role: 'user', content: `Tag this journal entry:\n\n${content}` }],
    }),
  })

  if (!res.ok) throw new Error(`Claude error: ${res.status}`)
  const data = await res.json() as { content: Array<{ text: string }> }
  const text = data.content[0]?.text ?? '[]'

  try {
    const parsed = JSON.parse(text.trim()) as BehavioralTag[]
    return parsed.filter(t =>
      ALL_TAGS.includes(t.tag) &&
      ['positive', 'negative', 'neutral'].includes(t.valence) &&
      t.intensity >= 0.4
    )
  } catch {
    return []
  }
}

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { entry_id, user_id, content } = await req.json()
    if (!entry_id || !user_id || !content) {
      return errorResponse('entry_id, user_id, content required', 400)
    }

    const tags = await extractBehavioralTags(content)
    if (tags.length === 0) {
      return jsonResponse({ tags_written: 0, message: 'No behavioral tags detected' })
    }

    const supabase = getServiceClient()
    const tagNames = tags.map(t => t.tag)

    const { error } = await supabase
      .from('entries')
      .update({ tags: tagNames })
      .eq('id', entry_id)
      .eq('user_id', user_id)

    if (error) throw error

    return jsonResponse({ tags_written: tagNames.length, tags: tagNames, success: true })
  } catch (err) {
    console.error('behavioral-tag error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error')
  }
})
