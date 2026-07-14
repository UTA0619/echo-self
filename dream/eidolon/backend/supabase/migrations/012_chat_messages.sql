-- Migration 012: Chat messages — persistent, continuous conversation
-- Until now the Eidolon chat lived only in client memory and each turn was sent
-- to the model in isolation (no history), so the companion forgot the previous
-- message and lost everything on app restart. This table is the authoritative
-- conversation log: the edge function reads the recent turns for context and
-- appends each new turn, giving real multi-turn continuity across devices.

create type public.chat_role as enum ('user', 'eidolon');

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  eidolon_id  uuid not null references public.eidolons(id) on delete cascade,
  -- Denormalized for RLS without a join.
  user_id     uuid not null references public.users(id) on delete cascade,

  role        public.chat_role not null,
  content     text not null,
  model_used  text,             -- which model produced an 'eidolon' turn

  created_at  timestamptz not null default now()
);

-- The hot query is "the recent turns for this Eidolon, newest first".
create index idx_chat_messages_eidolon
  on public.chat_messages(eidolon_id, created_at desc);

-- RLS: players read/insert their own conversation; the service role (edge
-- function) writes both turns server-side.
alter table public.chat_messages enable row level security;

create policy "chat_messages_select_own"
  on public.chat_messages for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  with check (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "chat_messages_service_all"
  on public.chat_messages for all
  using (auth.role() = 'service_role');
