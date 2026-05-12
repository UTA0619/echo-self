import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { generateEmbedding } from '../../packages/ai-core/src/index.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { query_text, user_id, limit = 5, emotion_filter, min_importance = 0 } = await req.json()
    if (!query_text || !user_id) return errorResponse('query_text and user_id required', 400)

    const queryEmbedding = await generateEmbedding(OPENAI_API_KEY, query_text)
    const supabase = getServiceClient()

    const { data: memories, error } = await supabase.rpc('match_memories', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_user_id: user_id,
      match_count: limit,
      min_importance,
      emotion_filter: emotion_filter ?? null,
    })

    if (error) throw error

    // Temporal boost: memories < 30 days get 1.2x score
    const boosted = (memories ?? []).map((m: { similarity: number; memory_date: string }) => ({
      ...m,
      similarityScore: m.similarity * (
        new Date(m.memory_date) > new Date(Date.now() - 30 * 86_400_000) ? 1.2 : 1
      ),
    }))

    // Update last_accessed_at for retrieved memories
    const ids = boosted.map((m: { id: string }) => m.id)
    if (ids.length > 0) {
      await supabase.from('memories').update({ last_accessed_at: new Date().toISOString() }).in('id', ids)
    }

    return jsonResponse({ memories: boosted, success: true })
  } catch (err) {
    console.error('[memory-retrieve] Error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
