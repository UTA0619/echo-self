/**
 * identity-infer: Extract identity nodes (beliefs, values, fears, patterns)
 * from a user's journal entry using Claude Haiku.
 *
 * Triggered by: postgres webhook or manual POST after entry is saved.
 * Input:  { entry_id, user_id, content }
 * Output: upserts / reinforces rows in identity_nodes table
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import {
  buildIdentityInferSystemPrompt,
  buildIdentityInferPrompt,
  IDENTITY_TAXONOMY,
} from '../../packages/ai-core/src/prompts/identity-infer.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL             = 'claude-haiku-4-5-20251001'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IdentityNodeExtraction {
  type:        string
  label:       string
  description: string
  polarity:    'positive' | 'negative' | 'neutral'
  confidence:  number
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function extractIdentityNodes(
  content:       string,
  existingNodes: Array<{ type: string; label: string }>,
  userName?:     string,
): Promise<IdentityNodeExtraction[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1024,
      system:     buildIdentityInferSystemPrompt(),
      messages:   [{ role: 'user', content: buildIdentityInferPrompt({ content, existingNodes, userName }) }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json() as { content: Array<{ text: string }> }
  const text = data.content[0]?.text ?? '[]'

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0]) as IdentityNodeExtraction[]
    return parsed.filter(n =>
      (IDENTITY_TAXONOMY as readonly string[]).includes(n.type) &&
      n.label && n.description &&
      ['positive', 'negative', 'neutral'].includes(n.polarity) &&
      n.confidence >= 0.6,
    )
  } catch {
    return []
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { entry_id, user_id, content } = await req.json()
    if (!entry_id || !user_id || !content) {
      return errorResponse('entry_id, user_id, content required', 400)
    }

    if (content.trim().split(/\s+/).length < 15) {
      return jsonResponse({ nodes_created: 0, message: 'Entry too short for identity extraction' })
    }

    const supabase = getServiceClient()

    // Fetch existing identity nodes so the prompt can avoid duplicates
    const { data: existingNodes } = await supabase
      .from('identity_nodes')
      .select('type, label, confidence, evidence, id')
      .eq('user_id', user_id)
      .eq('active', true)
      .limit(30)

    // Fetch profile for personalised prompting
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('auth_id', user_id)
      .maybeSingle()

    const nodes = await extractIdentityNodes(
      content,
      existingNodes ?? [],
      profile?.display_name ?? undefined,
    )

    if (nodes.length === 0) {
      return jsonResponse({ nodes_created: 0, message: 'No identity signals detected' })
    }

    const upsertResults = await Promise.allSettled(
      nodes.map(async (node) => {
        const existing = (existingNodes ?? []).find(
          (e) => e.type === node.type && e.label === node.label,
        )

        if (existing) {
          // Reinforce: nudge confidence up, append entry to evidence
          const newConfidence = Math.min(1, existing.confidence + 0.05)
          const newEvidence   = [...(existing.evidence ?? []), entry_id].slice(-10)

          const { error } = await supabase
            .from('identity_nodes')
            .update({ confidence: newConfidence, evidence: newEvidence })
            .eq('id', existing.id)

          if (error) throw error
          return { action: 'reinforced', label: node.label }
        }

        const { error } = await supabase.from('identity_nodes').insert({
          user_id,
          type:        node.type,
          label:       node.label,
          description: node.description,
          polarity:    node.polarity,
          confidence:  node.confidence,
          evidence:    [entry_id],
          active:      true,
        })

        if (error) throw error
        return { action: 'created', label: node.label }
      }),
    )

    const created    = upsertResults.filter((r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ action: string; label: string }>).value.action === 'created').length
    const reinforced = upsertResults.filter((r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ action: string; label: string }>).value.action === 'reinforced').length

    console.log(JSON.stringify({ msg: 'identity_infer_complete', user_id, entry_id, created, reinforced }))
    return jsonResponse({ nodes_created: created, nodes_reinforced: reinforced, success: true })
  } catch (err) {
    console.error('[identity-infer] error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error')
  }
})
