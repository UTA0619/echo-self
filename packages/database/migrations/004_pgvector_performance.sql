-- Migration 004: pgvector performance hardening
-- Adds IVFFlat index for fast ANN search, partial indexes for filtering,
-- and a materialized view for analytics.

-- ──────────────────────────────────────────────────────────────────────────
-- IVFFlat index on memories.embedding
--
-- lists=100 is a good default for ~100k rows (sqrt(n)).
-- Increase lists as the dataset grows; rebuild with CONCURRENT when live.
-- probes is set per-session in memory-retrieve: SET ivfflat.probes = 10
-- ──────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memories_embedding_ivfflat
  ON memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Partial index scoped by user — speeds up per-user searches dramatically
-- when the dataset has many users (avoids full scan + filter).
-- Note: PostgreSQL cannot create per-user partial indexes dynamically;
-- instead we create a composite BTREE index on (user_id, importance)
-- which the planner uses to pre-filter before the ANN scan.
CREATE INDEX IF NOT EXISTS idx_memories_user_importance
  ON memories (user_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_memories_user_type
  ON memories (user_id, memory_type);

-- ──────────────────────────────────────────────────────────────────────────
-- Journal entries — index for streak/timeline queries
-- ──────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_user_date
  ON journal_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_date_trunc
  ON journal_entries (user_id, DATE(created_at AT TIME ZONE 'UTC'));

-- ──────────────────────────────────────────────────────────────────────────
-- Updated match_memories RPC with probes hint for production performance
-- Replaces the version from 002_match_memories.sql
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding   vector(3072),
  match_user_id     UUID,
  match_count       INT     DEFAULT 10,
  min_importance    FLOAT   DEFAULT 0.0,
  emotion_filter    TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  content       TEXT,
  memory_type   TEXT,
  importance    FLOAT,
  emotion_tags  TEXT[],
  themes        TEXT[],
  similarity    FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set ANN probe count for this session (10 = good recall/speed balance)
  SET LOCAL ivfflat.probes = 10;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type::TEXT,
    m.importance,
    m.emotion_tags::TEXT[],
    m.themes,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = match_user_id
    AND m.importance >= min_importance
    AND (emotion_filter IS NULL OR emotion_filter = ANY(m.emotion_tags::TEXT[]))
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Materialized view: user_emotion_summary
-- Aggregates emotion frequency by user/month for the timeline/arc features.
-- Refresh daily via pg_cron or Supabase edge function.
-- ──────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS user_emotion_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) AS month,
  (emotion_analysis->>'emotion')   AS primary_emotion,
  AVG((emotion_analysis->>'intensity')::FLOAT) AS avg_intensity,
  AVG((emotion_analysis->>'valence')::FLOAT)   AS avg_valence,
  COUNT(*)                                      AS entry_count
FROM   journal_entries
WHERE  emotion_analysis IS NOT NULL
GROUP  BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_summary_unique
  ON user_emotion_summary (user_id, month, primary_emotion);

-- Function to refresh the materialized view (call from cron)
CREATE OR REPLACE FUNCTION refresh_emotion_summary()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_emotion_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION match_memories(vector, UUID, INT, FLOAT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION refresh_emotion_summary()                       TO service_role;
GRANT SELECT  ON user_emotion_summary                                     TO service_role;
