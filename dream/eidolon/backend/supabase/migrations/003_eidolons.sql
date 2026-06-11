-- Migration 003: Eidolons table
-- Each user owns exactly one Eidolon (soul-twin AI companion)

create type public.eidolon_mood as enum (
  'calm', 'excited', 'anxious', 'tired', 'focused', 'melancholic'
);

create table public.eidolons (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.users(id) on delete cascade,
  name          text not null,
  level         integer not null default 1,
  xp            bigint not null default 0,
  xp_to_next    bigint not null default 1000,

  -- Big Five personality (0-100 each)
  openness          smallint not null default 50 check (openness between 0 and 100),
  conscientiousness smallint not null default 50 check (conscientiousness between 0 and 100),
  extraversion      smallint not null default 50 check (extraversion between 0 and 100),
  agreeableness     smallint not null default 50 check (agreeableness between 0 and 100),
  neuroticism       smallint not null default 50 check (neuroticism between 0 and 100),

  -- Combat stats (influenced by reality sync)
  base_atk      integer not null default 10,
  base_def      integer not null default 10,
  base_hp       integer not null default 100,
  base_mp       integer not null default 50,

  -- Current mood (updated by emotion logs + recent events)
  current_mood  public.eidolon_mood not null default 'calm',

  -- Appearance (procedurally generated / customized)
  appearance    jsonb not null default '{}'::jsonb,

  -- Autonomous behavior config
  auto_strategy text not null default 'balanced'
    check (auto_strategy in ('aggressive', 'balanced', 'defensive', 'explorer')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger eidolons_updated_at
  before update on public.eidolons
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_eidolons_user_id on public.eidolons(user_id);
create index idx_eidolons_level   on public.eidolons(level desc);

-- RLS
alter table public.eidolons enable row level security;

create policy "eidolons_select_own"
  on public.eidolons for select
  using (
    user_id in (
      select id from public.users where auth_uid = auth.uid()
    )
  );

create policy "eidolons_update_own"
  on public.eidolons for update
  using (
    user_id in (
      select id from public.users where auth_uid = auth.uid()
    )
  );

create policy "eidolons_insert_own"
  on public.eidolons for insert
  with check (
    user_id in (
      select id from public.users where auth_uid = auth.uid()
    )
  );

-- Other players can read Eidolons for social features (name, level, mood only)
create policy "eidolons_select_social"
  on public.eidolons for select
  using (true);  -- filtered by column-level grants in application layer

create policy "eidolons_service_all"
  on public.eidolons for all
  using (auth.role() = 'service_role');
