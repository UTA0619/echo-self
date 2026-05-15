-- Migration 002: match_memories RPC for semantic memory retrieval
-- Required by supabase/functions/memory-retrieve/index.ts

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- match_memories: cosine-similarity semantic search over the memories table.
-- Returns ranked rows for a given user, filtered by importance and optionally by emotion.
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding  vector(3072),
  match_user_id    UUID,
  match_count      INT     DEFAULT 5,
  min_importance   FLOAT   DEFAULT 0,
  emotion_filter   TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  content_chunk    TEXT,
  emotion          TEXT,
  emotion_score    FLOAT,
  tags             TEXT[],
  importance_score FLOAT,
  memory_date      DATE,
  similarity       FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    m.id,
    m.content_chunk,
    m.emotion,
    m.emotion_score,
    m.tags,
    m.importance_score,
    m.memory_date,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id       = match_user_id
    AND m.importance_score >= min_importance
    AND (emotion_filter IS NULL OR m.emotion = emotion_filter)
    AND 1 - (m.embedding <=> query_embedding) > 0.5
  ORDER BY m.embedding <=> query_embedding   -- ascending distance = descending similarity
  LIMIT match_count;
$$;

-- Grant execute to service_role (used by edge functions via service client)
GRANT EXECUTE ON FUNCTION match_memories(vector, UUID, INT, FLOAT, TEXT)
  TO service_role;

-- find_similar_memories: dedup helper used by memory-ingest before inserting.
-- Returns existing chunk IDs whose similarity to the candidate exceeds the threshold.
CREATE OR REPLACE FUNCTION find_similar_memories(
  query_embedding  vector(3072),
  match_user_id    UUID,
  similarity_threshold FLOAT DEFAULT 0.95,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    m.id,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = match_user_id
    AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION find_similar_memories(vector, UUID, FLOAT, INT)
  TO service_role;
