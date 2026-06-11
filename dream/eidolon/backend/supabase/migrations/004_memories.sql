-- Migration 004: Memories table (pgvector RAG pipeline)
-- Eidolon episodic / semantic / procedural memory store

create type public.memory_type as enum (
  'episodic',    -- specific events ("defeated the Shadow Drake on day 42")
  'semantic',    -- knowledge ("player prefers aggressive strategy")
  'procedural'   -- learned behavior ("always use MP heal before boss rooms")
);

create table public.memories (
  id            uuid primary key default gen_random_uuid(),
  eidolon_id    uuid not null references public.eidolons(id) on delete cascade,

  memory_type   public.memory_type not null default 'episodic',
  content       text not null,

  -- OpenAI text-embedding-3-small produces 1536-dim vectors
  embedding     vector(1536),

  -- Importance score (0.0-1.0); used for FIFO eviction priority
  importance    float4 not null default 0.5
    check (importance between 0.0 and 1.0),

  -- Emotional valence at time of memory formation
  emotion_tag   text,

  -- Source context
  source        text,  -- 'dungeon_event' | 'social' | 'reality_sync' | 'player_input'
  source_ref    uuid,  -- FK to run / visit / etc.

  -- Access tracking for importance decay
  access_count  integer not null default 0,
  last_accessed timestamptz,

  created_at    timestamptz not null default now()
);

-- HNSW index for fast approximate nearest-neighbor search
-- m=16, ef_construction=64 is a good default for 1536-dim
create index idx_memories_embedding
  on public.memories
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index idx_memories_eidolon_id   on public.memories(eidolon_id);
create index idx_memories_type         on public.memories(memory_type);
create index idx_memories_importance   on public.memories(importance desc);
create index idx_memories_created_at   on public.memories(created_at desc);

-- RLS
alter table public.memories enable row level security;

create policy "memories_select_own"
  on public.memories for select
  using (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

create policy "memories_insert_own"
  on public.memories for insert
  with check (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

create policy "memories_service_all"
  on public.memories for all
  using (auth.role() = 'service_role');

-- RAG search function: returns top-k memories by cosine similarity
create or replace function public.search_memories(
  p_eidolon_id  uuid,
  p_embedding   vector(1536),
  p_limit       integer default 5,
  p_memory_type public.memory_type default null
)
returns table (
  id          uuid,
  content     text,
  memory_type public.memory_type,
  importance  float4,
  similarity  float4,
  created_at  timestamptz
)
language sql stable security definer as $$
  select
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    1 - (m.embedding <=> p_embedding) as similarity,
    m.created_at
  from public.memories m
  where
    m.eidolon_id = p_eidolon_id
    and m.embedding is not null
    and (p_memory_type is null or m.memory_type = p_memory_type)
  order by m.embedding <=> p_embedding
  limit p_limit;
$$;

-- Eviction function: remove lowest-importance memories beyond the cap
create or replace function public.evict_memories(
  p_eidolon_id  uuid,
  p_max_count   integer default 128
)
returns integer
language plpgsql security definer as $$
declare
  v_count   integer;
  v_deleted integer;
begin
  select count(*) into v_count
  from public.memories
  where eidolon_id = p_eidolon_id;

  if v_count <= p_max_count then
    return 0;
  end if;

  with to_delete as (
    select id
    from public.memories
    where eidolon_id = p_eidolon_id
    order by importance asc, created_at asc
    limit (v_count - p_max_count)
  )
  delete from public.memories
  where id in (select id from to_delete);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
