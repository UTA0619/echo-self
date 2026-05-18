-- RPC function for vector similarity search on memories
create or replace function match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  content_type text,
  memory_date date,
  is_private boolean,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.user_id,
    m.content,
    m.content_type,
    m.memory_date,
    m.is_private,
    m.metadata,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where
    m.user_id = p_user_id
    and m.is_deleted = false
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
