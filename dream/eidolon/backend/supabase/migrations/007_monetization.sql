-- Migration 007: Monetization tables
-- Subscriptions, Gacha, Emotion Logs, Reality Sync

create type public.subscription_tier as enum ('free', 'soul_pass', 'eternal');

create table public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.users(id) on delete cascade,
  tier              public.subscription_tier not null default 'free',
  revenuecat_id     text unique,
  -- Entitlements
  monthly_currency  integer not null default 0,
  currency_claimed_at timestamptz,
  -- Validity
  starts_at         timestamptz not null default now(),
  expires_at        timestamptz,
  -- Spend protection (GDPR / Families Policy)
  monthly_spend_usd numeric(10,2) not null default 0,
  spend_reset_at    timestamptz not null default date_trunc('month', now()) + interval '1 month',
  is_minor          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_tier    on public.subscriptions(tier);

-- Gacha pulls (full audit trail — required by store policies)
create table public.gacha_pulls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  pool_id     text not null,
  count       smallint not null default 1 check (count in (1, 10)),
  results     jsonb not null default '[]'::jsonb,
  currency_spent integer not null,
  pity_before    integer not null default 0,
  pity_after     integer not null default 0,
  pulled_at   timestamptz not null default now()
);

create index idx_gacha_pulls_user_id  on public.gacha_pulls(user_id);
create index idx_gacha_pulls_pool_id  on public.gacha_pulls(pool_id);
create index idx_gacha_pulls_pulled_at on public.gacha_pulls(pulled_at desc);

-- Emotion logs (player-reported daily mood → affects world weather)
create type public.emotion_type as enum (
  'happy', 'neutral', 'anxious', 'tired', 'energized', 'sad', 'focused', 'excited'
);

create table public.emotion_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  emotion     public.emotion_type not null,
  intensity   smallint not null default 5 check (intensity between 1 and 10),
  note        text,
  logged_at   timestamptz not null default now(),
  date        date not null default current_date
);

-- One log per day per user
create unique index idx_emotion_logs_user_date
  on public.emotion_logs(user_id, date);

-- Reality sync snapshots (HealthKit / Health Connect data)
create table public.reality_syncs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  sync_date     date not null default current_date,
  steps         integer not null default 0,
  sleep_hours   float4,
  hrv_score     float4,
  active_cal    integer,
  -- Computed game bonuses (cached)
  atk_bonus     float4 not null default 1.0,
  hp_modifier   float4 not null default 1.0,
  eidolon_mood  public.eidolon_mood not null default 'calm',
  synced_at     timestamptz not null default now()
);

create unique index idx_reality_syncs_user_date
  on public.reality_syncs(user_id, sync_date);

-- RLS
alter table public.subscriptions enable row level security;
alter table public.gacha_pulls enable row level security;
alter table public.emotion_logs enable row level security;
alter table public.reality_syncs enable row level security;

create policy "subscriptions_select_own" on public.subscriptions for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));
create policy "subscriptions_service_all" on public.subscriptions for all
  using (auth.role() = 'service_role');

create policy "gacha_pulls_select_own" on public.gacha_pulls for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));
create policy "gacha_pulls_service_all" on public.gacha_pulls for all
  using (auth.role() = 'service_role');

create policy "emotion_logs_own" on public.emotion_logs for all
  using (user_id in (select id from public.users where auth_uid = auth.uid()));
create policy "emotion_logs_service_all" on public.emotion_logs for all
  using (auth.role() = 'service_role');

create policy "reality_syncs_own" on public.reality_syncs for all
  using (user_id in (select id from public.users where auth_uid = auth.uid()));
create policy "reality_syncs_service_all" on public.reality_syncs for all
  using (auth.role() = 'service_role');
