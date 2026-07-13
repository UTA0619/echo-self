-- ══════════════════════════════════════════════════════════════════════════════
-- ECHO//SELF — Consolidated core schema (auth-id model)
--
-- WHY THIS EXISTS:
--   The app and the newer edge functions write `user_id = auth.uid()` directly
--   (e.g. `entries.insert({ user_id: user.id })`, `daily_digests` FK →
--   auth.users). The older `packages/database/migrations` set instead used a
--   separate `public.users` table with `user_id → users.id` and RLS via
--   `current_user_id()`. Those two models are incompatible, so the app never ran
--   end-to-end against its own deployable schema.
--
--   This migration is the single source of truth deployed by `supabase db push`.
--   Every `user_id` references `auth.users(id)`; `profiles.id`/`users.id` ARE the
--   auth user id. A signup trigger provisions the profile rows. This matches how
--   the application code actually reads and writes.
-- ══════════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Back-compat helper: some SQL/edge code references current_user_id().
-- In the auth-id model this is simply the auth uid.
create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;

-- ── USERS (profile/stats; id = auth.users.id) ─────────────────────────────────
create table public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  auth_id           uuid unique not null,             -- = id (kept for app queries)
  email             text,
  display_name      text,
  avatar_url        text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free','premium')),
  current_streak    integer not null default 0 check (current_streak >= 0),
  longest_streak    integer not null default 0 check (longest_streak >= 0),
  total_entries     integer not null default 0 check (total_entries >= 0),
  last_entry_date   date,
  onboarding_data   jsonb not null default '{}'::jsonb,
  preferences       jsonb not null default '{"notifications":true,"darkMode":true,"haptics":true}'::jsonb,
  timezone          text not null default 'UTC',
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ── PROFILES (onboarding/notifications; id = auth.users.id) ───────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  auth_id           uuid not null unique,             -- = id (app filters .eq('auth_id'))
  display_name      text,
  avatar_url        text,
  timezone          text not null default 'UTC',
  onboarding_data   jsonb not null default '{}'::jsonb,
  onboarding_done   boolean not null default false,
  notification_time time not null default '09:00:00',
  notification_enabled boolean not null default true,
  streak_goal       integer not null default 5,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision users + profiles rows on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, auth_id, email)
  values (new.id, new.id, new.email)
  on conflict (id) do nothing;

  insert into public.profiles (id, auth_id)
  values (new.id, new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ENTRIES (core journal) ────────────────────────────────────────────────────
create table public.entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null check (length(content) between 1 and 5000),
  voice_url     text,
  emotion       text check (emotion in ('joy','sadness','anger','fear','surprise','disgust','anticipation','trust','optimism','love','awe')),
  emotion_score float check (emotion_score between 0 and 1),
  emotion_data  jsonb default '{}'::jsonb,
  tags          text[] not null default array[]::text[],
  ai_response   text,
  echo_rating   smallint check (echo_rating in (-1, 1)),
  word_count    integer generated always as (array_length(string_to_array(trim(content), ' '), 1)) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index entries_user_created on public.entries(user_id, created_at desc);
create index entries_user_emotion on public.entries(user_id, emotion);
create trigger entries_updated_at before update on public.entries
  for each row execute function public.set_updated_at();

-- ── MEMORIES (pgvector; no ANN index — 3072 dims exceed ivfflat/hnsw limit) ───
create table public.memories (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  entry_id         uuid references public.entries(id) on delete set null,
  content_chunk    text not null,
  embedding        vector(3072) not null,
  emotion          text,
  emotion_score    float check (emotion_score between 0 and 1),
  tags             text[] not null default array[]::text[],
  importance_score float not null default 0.5 check (importance_score between 0 and 1),
  memory_date      date not null default current_date,
  last_accessed_at timestamptz,
  created_at       timestamptz not null default now()
);
create index memories_user_date on public.memories(user_id, memory_date desc);

-- ── EMOTION HISTORY (daily rollup) ────────────────────────────────────────────
create table public.emotion_history (
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  emotion_counts jsonb not null default '{}'::jsonb,
  avg_valence    float check (avg_valence between 0 and 1),
  entry_count    integer not null default 0,
  primary key (user_id, date)
);

-- ── IDENTITY NODES ────────────────────────────────────────────────────────────
create table public.identity_nodes (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('belief','value','core_fear','core_desire','behavioral_pattern','relationship_pattern','strength')),
  label          text not null,
  description    text,
  evidence       text[] not null default '{}',
  confidence     float not null default 0.5 check (confidence between 0 and 1),
  polarity       text not null default 'neutral' check (polarity in ('positive','negative','neutral')),
  active         boolean not null default true,
  evidence_count integer not null default 1,
  first_seen     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index identity_nodes_user on public.identity_nodes(user_id, active);

-- ── IDENTITY TRAITS (seeded at onboarding — was missing from every schema) ────
create table public.identity_traits (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  trait_name     text not null,
  trait_category text not null default 'value',
  confidence     float not null default 0.5 check (confidence between 0 and 1),
  evidence_count integer not null default 1,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index identity_traits_user on public.identity_traits(user_id);

-- ── BEHAVIORAL PATTERNS ───────────────────────────────────────────────────────
create table public.behavioral_patterns (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  pattern_type        text not null,
  pattern_description text not null,
  frequency_days      integer not null default 7,
  confidence          float not null default 0.5 check (confidence between 0 and 1),
  trigger_tags        text[] not null default '{}',
  evidence_entry_ids  uuid[] not null default '{}',
  is_active           boolean not null default true,
  last_seen_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index behavioral_patterns_user on public.behavioral_patterns(user_id, last_seen_at desc);

-- ── ENTRY BEHAVIORAL TAGS ─────────────────────────────────────────────────────
create table public.entry_behavioral_tags (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entry_id          uuid not null references public.entries(id) on delete cascade,
  tags              text[] not null default '{}',
  dominant_theme    text,
  growth_indicators text[] not null default '{}',
  risk_indicators   text[] not null default '{}',
  created_at        timestamptz not null default now(),
  unique (entry_id)
);

-- ── FUTURE SELF SIMULATIONS ───────────────────────────────────────────────────
create table public.future_self_simulations (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  horizon_months   integer not null check (horizon_months in (1, 3, 12, 36)),
  narrative        text not null,
  letter_text      text,
  trajectory_score float check (trajectory_score between 1 and 10),
  created_at       timestamptz not null default now(),
  unique (user_id, horizon_months)
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid unique not null references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text not null default 'free' check (plan in ('free','premium_monthly','premium_annual')),
  status                 text not null default 'inactive' check (status in ('active','inactive','trialing','past_due','canceled')),
  trial_end              timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── REFERRALS (per-user aggregate: one row per user, with code + counters) ────
create table public.referrals (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid unique not null references auth.users(id) on delete cascade,
  referral_code        text unique not null,
  total_referrals      integer not null default 0,
  successful_referrals integer not null default 0,
  reward_months_earned integer not null default 0,
  created_at           timestamptz not null default now()
);
create index referrals_user on public.referrals(user_id);

-- Referral attribution events (who referred whom) — kept separate from the counter row
create table public.referral_events (
  id           uuid primary key default uuid_generate_v4(),
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  referred_id  uuid references auth.users(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending','completed','rewarded')),
  created_at   timestamptz not null default now()
);
create index referral_events_referrer on public.referral_events(referrer_id);

-- ── IDENTITY SHARES (public share cards) ──────────────────────────────────────
create table public.identity_shares (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  top_nodes    jsonb not null default '[]',
  share_text   text,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── CRISIS EVENTS (safety) ────────────────────────────────────────────────────
create table public.crisis_events (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  entry_id       uuid references public.entries(id) on delete set null,
  severity       text not null check (severity in ('critical','high','medium','low')),
  trigger_phrase text,
  detected_tags  text[] not null default '{}',
  response_sent  boolean not null default false,
  resolved       boolean not null default false,
  resolved_by    text,
  resolved_at    timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ── NOTIFICATIONS + PUSH TOKENS ───────────────────────────────────────────────
create table public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null,
  title        text,
  body         text,
  message      text,
  deep_link    text,
  sent_at      timestamptz not null default now(),
  opened_at    timestamptz,
  onesignal_id text,
  created_at   timestamptz not null default now()
);
create index notifications_user on public.notifications(user_id, sent_at desc);

create table public.push_tokens (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform        text not null check (platform in ('ios','android')),
  created_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

-- ── ANALYTICS + DAILY DIGESTS ─────────────────────────────────────────────────
create table public.analytics_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.daily_digests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  digest_date       date not null,
  summary           text not null,
  entry_count       int not null default 1,
  total_words       int not null default 0,
  dominant_emotion  text,
  avg_emotion_score float,
  source_entry_ids  uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  unique (user_id, digest_date)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — every table: a user can only touch their own rows.
-- ══════════════════════════════════════════════════════════════════════════════
alter table public.users                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.entries               enable row level security;
alter table public.memories              enable row level security;
alter table public.emotion_history       enable row level security;
alter table public.identity_nodes        enable row level security;
alter table public.identity_traits       enable row level security;
alter table public.behavioral_patterns   enable row level security;
alter table public.entry_behavioral_tags enable row level security;
alter table public.future_self_simulations enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.referrals             enable row level security;
alter table public.referral_events       enable row level security;
alter table public.identity_shares       enable row level security;
alter table public.crisis_events         enable row level security;
alter table public.notifications         enable row level security;
alter table public.push_tokens           enable row level security;
alter table public.analytics_events      enable row level security;
alter table public.daily_digests         enable row level security;

-- Self-owned by primary key (id = auth uid)
create policy users_own    on public.users    for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_own on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Self-owned by user_id (= auth uid)
create policy entries_own                 on public.entries                 for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy memories_own                on public.memories                for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy emotion_history_own         on public.emotion_history         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy identity_nodes_own          on public.identity_nodes          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy identity_traits_own         on public.identity_traits         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy behavioral_patterns_own     on public.behavioral_patterns     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entry_behavioral_tags_own   on public.entry_behavioral_tags   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy future_self_simulations_own on public.future_self_simulations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subscriptions_own           on public.subscriptions           for select using (user_id = auth.uid());
create policy referrals_own               on public.referrals               for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy referral_events_own         on public.referral_events         for all using (referrer_id = auth.uid()) with check (referrer_id = auth.uid());
create policy crisis_events_own           on public.crisis_events           for select using (user_id = auth.uid());
create policy notifications_own           on public.notifications           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_own             on public.push_tokens             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_digests_own           on public.daily_digests           for select using (user_id = auth.uid());
create policy analytics_insert_own        on public.analytics_events        for insert with check (user_id = auth.uid() or user_id is null);

-- Identity shares: owner manages; anyone can read public cards
create policy identity_shares_owner  on public.identity_shares for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy identity_shares_public on public.identity_shares for select using (is_public = true);
