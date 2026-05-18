/**
 * identity-infer: Extract identity nodes (beliefs, values, fears, patterns)
 * from a user's journal entry using Claude.
 *
 * Triggered by: postgres webhook or manual call after entry ai_response is set.
 * Input: { entry_id, user_id, content }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

const IDENTITY_TAXONOMY = [
  'belief',
  'value',
  'core_fear',
  'core_desire',
  'behavioral_pattern',
  'relationship_pattern',
  'strength',
] as const

type IdentityType = typeof IDENTITY_TAXONOMY[number]

interface IdentityNodeExtraction {
  type: IdentityType
  label: string
  description: string
  polarity: 'positive' | 'negative' | 'neutral'
  confidence: number
}

async function extractIdentityNodes(content: string): Promise<IdentityNodeExtraction[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: `You are an expert psychologist extracting identity signals from journal entries.
Extract identity nodes from this journal entry. Return a JSON array of nodes.
Each node must have:
- type: one of [${IDENTITY_TAXONOMY.join(', ')}]
- label: short label (2-5 words, lowercase)
- description: one sentence explaining this identity signal
- polarity: "positive" | "negative" | "neutral"
- confidence: 0.0-1.0 (how confident you are this is a real signal)

Rules:
- Only extract nodes with confidence >= 0.6
- Max 5 nodes per entry
- Be specific — "fear of abandonment" not "has fears"
- Require at least 2 mentions or strong emotional weight for confidence > 0.8
- Return ONLY valid JSON array, no markdown`,
      messages: [
        {
          role: 'user',
          content: `Extract identity nodes from this journal entry:\n\n${content}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json() as { content: Array<{ text: string }> }
  const text = data.content[0]?.text ?? '[]'

  try {
    const parsed = JSON.parse(text.trim()) as IdentityNodeExtraction[]
    return parsed.filter(n =>
      IDENTITY_TAXONOMY.includes(n.type) &&
      n.label && n.description &&
      ['positive', 'negative', 'neutral'].includes(n.polarity) &&
      n.confidence >= 0.6
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

    if (content.trim().split(' ').length < 15) {
      return jsonResponse({ nodes_created: 0, message: 'Entry too short for identity extraction' })
    }

    const nodes = await extractIdentityNodes(content)
    if (nodes.length === 0) {
      return jsonResponse({ nodes_created: 0, message: 'No identity signals detected' })
    }

    const supabase = getServiceClient()

    const upsertResults = await Promise.allSettled(
      nodes.map(async (node) => {
        // Check if this node label already exists for this user
        const { data: existing } = await supabase
          .from('identity_nodes')
          .select('id, confidence, evidence')
          .eq('user_id', user_id)
          .eq('label', node.label)
          .eq('type', node.type)
          .maybeSingle()

        if (existing) {
          // Reinforce existing node: increase confidence, add evidence
          const newConfidence = Math.min(1, existing.confidence + 0.05)
          const newEvidence = [...(existing.evidence ?? []), entry_id].slice(-10)

          const { error } = await supabase
            .from('identity_nodes')
            .update({
              confidence: newConfidence,
              evidence: newEvidence,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (error) throw error
          return { action: 'reinforced', label: node.label }
        } else {
          // Create new node
          const { error } = await supabase.from('identity_nodes').insert({
            user_id,
            type: node.type,
            label: node.label,
            description: node.description,
            polarity: node.polarity,
            confidence: node.confidence,
            evidence: [entry_id],
            active: true,
          })

          if (error) throw error
          return { action: 'created', label: node.label }
        }
      })
    )

    const created = upsertResults.filter(r => r.status === 'fulfilled' && r.value.action === 'created').length
    const reinforced = upsertResults.filter(r => r.status === 'fulfilled' && r.value.action === 'reinforced').length

    return jsonResponse({ nodes_created: created, nodes_reinforced: reinforced, success: true })
  } catch (err) {
    console.error('identity-infer error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error')
  }
})
