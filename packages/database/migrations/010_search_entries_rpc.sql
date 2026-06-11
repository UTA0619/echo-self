-- ── search_entries RPC ────────────────────────────────────────────────────────
-- Semantic search over journal entries using pgvector cosine similarity.
-- Called by the /api/search web route. Returns entries ranked by similarity.
--
-- Entries don't store embeddings directly — the memories table does.
-- This function finds the most similar memory chunks and returns their
-- parent entries, de-duplicated.

CREATE OR REPLACE FUNCTION search_entries(
  p_user_id         UUID,
  p_query_embedding vector(3072),
  p_match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id           UUID,
  content      TEXT,
  created_at   TIMESTAMPTZ,
  emotion      TEXT,
  ai_response  TEXT,
  similarity   FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_memories AS (
    SELECT
      m.entry_id,
      MAX(1 - (m.embedding <=> p_query_embedding)) AS best_similarity
    FROM memories m
    WHERE m.user_id = p_user_id
      AND m.embedding IS NOT NULL
    GROUP BY m.entry_id
    ORDER BY best_similarity DESC
    LIMIT p_match_count * 2          -- over-fetch; de-dup happens below
  )
  SELECT
    e.id,
    e.content,
    e.created_at,
    e.emotion,
    e.ai_response,
    rm.best_similarity   AS similarity
  FROM ranked_memories rm
  JOIN entries e ON e.id = rm.entry_id
  WHERE e.user_id = p_user_id
  ORDER BY rm.best_similarity DESC
  LIMIT p_match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_entries(UUID, vector, INT) TO service_role;
GRANT EXECUTE ON FUNCTION search_entries(UUID, vector, INT) TO authenticated;

-- ── Hybrid keyword + semantic search ─────────────────────────────────────────
-- Used as a fallback in the web search API when the primary semantic call fails,
-- and as an alternative for short keyword queries.

CREATE OR REPLACE FUNCTION search_entries_text(
  p_user_id   UUID,
  p_query     TEXT,
  p_limit     INT DEFAULT 10
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  created_at  TIMESTAMPTZ,
  emotion     TEXT,
  ai_response TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.created_at,
    e.emotion,
    e.ai_response
  FROM entries e
  WHERE e.user_id = p_user_id
    AND e.content ILIKE '%' || p_query || '%'
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_entries_text(UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION search_entries_text(UUID, TEXT, INT) TO authenticated;
