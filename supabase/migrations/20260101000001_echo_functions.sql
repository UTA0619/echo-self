-- ══════════════════════════════════════════════════════════════════════════════
-- ECHO//SELF — RPC functions & views (auth-id model)
--
-- These are the RPCs/views the app and edge functions call by name. All are
-- parameterized by user_id (the caller passes auth.uid()), so they are identical
-- under the auth-id model — they filter `WHERE user_id = <param>` against the
-- tables defined in 20260101000000_echo_core_schema.sql.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Semantic memory search (edge: memory-retrieve, update-future-self) ─────────
create or replace function public.match_memories(
  query_embedding vector(3072),
  match_user_id   uuid,
  match_count     int   default 5,
  min_importance  float default 0,
  emotion_filter  text  default null
)
returns table (
  id uuid, content_chunk text, emotion text, emotion_score float,
  tags text[], importance_score float, memory_date date, similarity float
)
language sql stable as $$
  select m.id, m.content_chunk, m.emotion, m.emotion_score, m.tags,
         m.importance_score, m.memory_date,
         1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = match_user_id
    and m.importance_score >= min_importance
    and (emotion_filter is null or m.emotion = emotion_filter)
    and 1 - (m.embedding <=> query_embedding) > 0.5
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function public.match_memories(vector, uuid, int, float, text) to service_role;

create or replace function public.find_similar_memories(
  query_embedding vector(3072),
  match_user_id   uuid,
  similarity_threshold float default 0.95,
  match_count     int default 5
)
returns table (id uuid, similarity float)
language sql stable as $$
  select m.id, 1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = match_user_id
    and 1 - (m.embedding <=> query_embedding) >= similarity_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function public.find_similar_memories(vector, uuid, float, int) to service_role;

-- ── Entry search (web: /api/search, /api/future-self) ─────────────────────────
create or replace function public.search_entries(
  p_user_id uuid, p_query_embedding vector(3072), p_match_count int default 10
)
returns table (id uuid, content text, created_at timestamptz, emotion text, ai_response text, similarity float)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with ranked_memories as (
    select m.entry_id, max(1 - (m.embedding <=> p_query_embedding)) as best_similarity
    from memories m
    where m.user_id = p_user_id and m.embedding is not null
    group by m.entry_id
    order by best_similarity desc
    limit p_match_count * 2
  )
  select e.id, e.content, e.created_at, e.emotion, e.ai_response, rm.best_similarity as similarity
  from ranked_memories rm
  join entries e on e.id = rm.entry_id
  where e.user_id = p_user_id
  order by rm.best_similarity desc
  limit p_match_count;
end;
$$;
grant execute on function public.search_entries(uuid, vector, int) to service_role, authenticated;

create or replace function public.search_entries_text(
  p_user_id uuid, p_query text, p_limit int default 10
)
returns table (id uuid, content text, created_at timestamptz, emotion text, ai_response text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select e.id, e.content, e.created_at, e.emotion, e.ai_response
  from entries e
  where e.user_id = p_user_id and e.content ilike '%' || p_query || '%'
  order by e.created_at desc
  limit p_limit;
end;
$$;
grant execute on function public.search_entries_text(uuid, text, int) to service_role, authenticated;

-- ── Future-self prediction cohort (edge: update-future-self cron) ─────────────
create or replace function public.get_users_for_prediction()
returns table (user_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select u.id as user_id
  from users u
  where u.deleted_at is null
    and u.subscription_tier = 'premium'
    and (select count(*) from memories m where m.user_id = u.id) >= 20
  order by u.last_entry_date desc nulls last;
end;
$$;
grant execute on function public.get_users_for_prediction() to service_role;

-- ── Crisis event upsert (edge: safety-check) ──────────────────────────────────
create or replace function public.upsert_crisis_event(
  p_user_id uuid, p_entry_id uuid, p_severity text,
  p_trigger_phrase text default null, p_detected_tags text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into crisis_events (user_id, entry_id, severity, trigger_phrase, detected_tags)
  values (p_user_id, p_entry_id, p_severity, p_trigger_phrase, p_detected_tags)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.upsert_crisis_event(uuid, uuid, text, text, text[]) to service_role;

-- ── 7-day emotion rollup view (dashboard / digests) ───────────────────────────
create or replace view public.emotion_history_7d as
select
  e.user_id,
  date(e.created_at) as date,
  mode() within group (order by e.emotion) as dominant_emotion,
  avg(case when e.emotion in ('joy','trust','anticipation','optimism','love') then 1
           when e.emotion in ('sadness','fear','anger','disgust') then -1
           else 0 end) as avg_valence
from entries e
where e.created_at >= now() - interval '7 days' and e.emotion is not null
group by e.user_id, date(e.created_at);
grant select on public.emotion_history_7d to service_role, authenticated;
