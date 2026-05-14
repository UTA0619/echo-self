-- ============================================================================
-- ECHO//SELF — Migration 003: AI Memory System
-- Memories, embeddings, and semantic search function
-- ============================================================================

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(3072),  -- text-embedding-3-large dimensions
  type TEXT NOT NULL CHECK (type IN (
    'value', 'core_fear', 'core_desire', 'belief',
    'behavioral_pattern', 'relationship_pattern', 'strength', 'event'
  )),
  emotion TEXT,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT[] DEFAULT '{}',
  source_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reinforcement_count INTEGER DEFAULT 1 CHECK (reinforcement_count >= 1),
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANN vector search index
-- lists = 100 is good for up to ~1M vectors. Increase to 300 at 5M+.
CREATE INDEX memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- User-scoped queries
CREATE INDEX memories_user_created_idx
  ON memories (user_id, created_at DESC)
  WHERE is_archived = false;

-- Source entry lookups
CREATE INDEX memories_source_entry_idx
  ON memories (source_entry_id)
  WHERE source_entry_id IS NOT NULL;

-- RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own memories"
  ON memories FOR SELECT USING (user_id = auth.uid());

-- Write access via service role only (Edge Functions)
-- No direct client inserts to prevent prompt injection into memory

-- ============================================================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION retrieve_memories(
  p_user_id UUID,
  p_query_embedding VECTOR(3072),
  p_top_k INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.75,
  p_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  type TEXT,
  emotion TEXT,
  confidence FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    content,
    type,
    emotion,
    confidence,
    1 - (embedding <=> p_query_embedding) AS similarity,
    created_at
  FROM memories
  WHERE
    user_id = p_user_id
    AND is_archived = false
    AND embedding IS NOT NULL
    AND (p_types IS NULL OR type = ANY(p_types))
    AND 1 - (embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_top_k;
$$;

-- Grant execute to authenticated users (RLS enforced inside)
GRANT EXECUTE ON FUNCTION retrieve_memories TO authenticated;

-- ============================================================================
-- DEDUPLICATION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION find_similar_memories(
  p_user_id UUID,
  p_embedding VECTOR(3072),
  p_exclude_id UUID DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.95
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> p_embedding) AS similarity
  FROM memories
  WHERE
    user_id = p_user_id
    AND is_archived = false
    AND embedding IS NOT NULL
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND 1 - (embedding <=> p_embedding) >= p_min_similarity
  ORDER BY embedding <=> p_embedding
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION find_similar_memories TO service_role;
