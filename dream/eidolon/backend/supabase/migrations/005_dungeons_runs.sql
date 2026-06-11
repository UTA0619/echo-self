-- Migration 005: Dungeons and Runs tables

create type public.dungeon_theme as enum (
  'forest', 'cave', 'ruins', 'void', 'ocean_depth',
  'sky_citadel', 'shadow_realm', 'crystal_maze'
);

create type public.run_status as enum (
  'in_progress', 'completed', 'failed', 'abandoned'
);

create table public.dungeons (
  id              uuid primary key default gen_random_uuid(),
  theme           public.dungeon_theme not null,
  difficulty      smallint not null default 1 check (difficulty between 1 and 10),
  name            text not null,
  narrative_intro text not null,
  layout          jsonb not null default '[]'::jsonb,  -- array of room configs
  boss_config     jsonb not null default '{}'::jsonb,
  special_events  jsonb not null default '[]'::jsonb,
  -- AI generation metadata
  ai_model        text not null default 'claude-haiku-4-5',
  generation_ms   integer,                             -- latency tracking
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '7 days'
);

create index idx_dungeons_theme       on public.dungeons(theme);
create index idx_dungeons_difficulty  on public.dungeons(difficulty);
create index idx_dungeons_expires_at  on public.dungeons(expires_at);

-- Dungeon runs: records each Eidolon's dungeon attempt
create table public.runs (
  id          uuid primary key default gen_random_uuid(),
  eidolon_id  uuid not null references public.eidolons(id) on delete cascade,
  dungeon_id  uuid not null references public.dungeons(id) on delete cascade,
  status      public.run_status not null default 'in_progress',
  -- Progress
  current_room    integer not null default 0,
  rooms_cleared   integer not null default 0,
  -- Combat summary
  damage_dealt    bigint not null default 0,
  damage_taken    bigint not null default 0,
  enemies_slain   integer not null default 0,
  -- Rewards
  xp_gained       integer not null default 0,
  gold_gained     integer not null default 0,
  loot            jsonb not null default '[]'::jsonb,
  -- Narrative log (AI-generated event summaries)
  event_log       jsonb not null default '[]'::jsonb,
  -- Timing
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  -- Was this an autonomous overnight run?
  is_autonomous   boolean not null default false
);

create trigger runs_updated_at_on_complete
  before update of status on public.runs
  for each row
  when (new.status in ('completed', 'failed', 'abandoned'))
  execute function public.set_updated_at();

create index idx_runs_eidolon_id   on public.runs(eidolon_id);
create index idx_runs_dungeon_id   on public.runs(dungeon_id);
create index idx_runs_status       on public.runs(status);
create index idx_runs_started_at   on public.runs(started_at desc);

-- RLS: users can only see their own runs
alter table public.dungeons enable row level security;
alter table public.runs enable row level security;

create policy "dungeons_select_all"   on public.dungeons for select using (true);
create policy "dungeons_service_all"  on public.dungeons for all using (auth.role() = 'service_role');

create policy "runs_select_own"
  on public.runs for select
  using (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

create policy "runs_service_all"
  on public.runs for all
  using (auth.role() = 'service_role');
