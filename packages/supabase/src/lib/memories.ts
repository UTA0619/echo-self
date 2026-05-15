import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '../types/database.js'

type MemoryRow = Tables<'memories'>

export interface RetrievedMemory {
  id: string
  content: string
  type: string
  emotion: string | null
  confidence: number
  similarity: number
  created_at: string
}

/**
 * Retrieve the top-K most semantically relevant memories for a user.
 * Uses pgvector cosine similarity via the retrieve_memories() RPC function.
 */
export async function retrieveMemories(
  supabase: SupabaseClient<Database>,
  {
    userId,
    queryEmbedding,
    topK = 10,
    minSimilarity = 0.75,
    types,
  }: {
    userId: string
    queryEmbedding: number[]
    topK?: number
    minSimilarity?: number
    types?: MemoryRow['type'][]
  }
): Promise<RetrievedMemory[]> {
  const { data, error } = await supabase.rpc('retrieve_memories', {
    p_user_id: userId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_top_k: topK,
    p_min_similarity: minSimilarity,
    p_types: types ?? null,
  })

  if (error) throw new Error(`retrieve_memories failed: ${error.message}`)
  return (data ?? []) as RetrievedMemory[]
}

/**
 * Check for near-duplicate memories before inserting.
 * Returns true if a similar memory already exists (similarity > threshold).
 */
export async function isDuplicateMemory(
  supabase: SupabaseClient<Database>,
  {
    userId,
    contentEmbedding,
    threshold = 0.95,
  }: {
    userId: string
    contentEmbedding: number[]
    threshold?: number
  }
): Promise<boolean> {
  const { data, error } = await supabase.rpc('find_similar_memories', {
    p_user_id: userId,
    p_content_embedding: JSON.stringify(contentEmbedding),
    p_threshold: threshold,
  })

  if (error) throw new Error(`find_similar_memories failed: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Get recent memories for a user (non-archived, sorted by recency).
 */
export async function getRecentMemories(
  supabase: SupabaseClient<Database>,
  {
    userId,
    limit = 20,
    daysSince = 30,
  }: {
    userId: string
    limit?: number
    daysSince?: number
  }
): Promise<MemoryRow[]> {
  const since = new Date(Date.now() - daysSince * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getRecentMemories failed: ${error.message}`)
  return data ?? []
}
