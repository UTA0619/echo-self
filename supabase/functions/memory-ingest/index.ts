import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { chunkText, generateEmbeddings, calculateImportanceScore } from '../../packages/ai-core/src/index.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { entry_id, user_id, content } = await req.json()
    if (!entry_id || !user_id || !content) return errorResponse('entry_id, user_id, content required', 400)

    if (content.trim().split(' ').length < 20) {
      return jsonResponse({ memories_created: 0, message: 'Entry too short to embed' })
    }

    const supabase = getServiceClient()

    // Get entry metadata
    const { data: entry } = await supabase
      .from('entries')
      .select('emotion, emotion_score, echo_rating, tags, word_count, created_at')
      .eq('id', entry_id)
      .single()

    const chunks = chunkText(content)
    const embeddings = await generateEmbeddings(OPENAI_API_KEY, chunks)

    const daysSinceEntry = Math.floor(
      (Date.now() - new Date(entry?.created_at ?? Date.now()).getTime()) / 86_400_000,
    )

    const memories = chunks.map((chunk, i) => ({
      user_id,
      entry_id,
      content_chunk: chunk,
      embedding: `[${embeddings[i]!.join(',')}]`,
      emotion: entry?.emotion ?? null,
      emotion_score: entry?.emotion_score ?? null,
      tags: entry?.tags ?? [],
      importance_score: calculateImportanceScore({
        emotionScore: entry?.emotion_score ?? null,
        wordCount: entry?.word_count ?? 0,
        daysSinceEntry,
        accessFrequency: 0,
        userRating: entry?.echo_rating ?? null,
      }),
      memory_date: entry?.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }))

    const { data: inserted, error } = await supabase.from('memories').insert(memories).select('id')
    if (error) throw error

    return jsonResponse({
      memories_created: inserted?.length ?? 0,
      avg_importance: memories.reduce((s, m) => s + m.importance_score, 0) / memories.length,
      success: true,
    })
  } catch (err) {
    console.error('[memory-ingest] Error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
