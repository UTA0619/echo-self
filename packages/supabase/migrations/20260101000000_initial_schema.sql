-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'founder')),
  onboarding_completed boolean not null default false,
  stripe_customer_id text unique,
  metadata jsonb not null default '{}'
);

alter table public.profiles enable row level security;

create policy "users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- MEMORIES
-- ============================================================
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  content_type text not null default 'journal'
    check (content_type in ('journal', 'voice', 'photo', 'auto')),
  source_url text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  memory_date date not null default current_date,
  is_private boolean not null default false,
  is_deleted boolean not null default false,
  metadata jsonb not null default '{}'
);

alter table public.memories enable row level security;

create policy "users can crud own memories"
  on public.memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.memories using hnsw (embedding vector_cosine_ops);
create index on public.memories (user_id, memory_date desc) where not is_deleted;
create index on public.memories (user_id, is_deleted);

-- ============================================================
-- MEMORY SUMMARIES
-- ============================================================
create table public.memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null
    check (period_type in ('day', 'week', 'month', 'year')),
  period_start date not null,
  period_end date not null,
  summary_text text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  source_memory_ids uuid[] not null default '{}',
  unique (user_id, period_type, period_start)
);

alter table public.memory_summaries enable row level security;

create policy "users can crud own summaries"
  on public.memory_summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.memory_summaries using hnsw (embedding vector_cosine_ops);
create index on public.memory_summaries (user_id, period_type, period_start desc);

-- ============================================================
-- IDENTITY TRAITS
-- ============================================================
create table public.identity_traits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trait_name text not null,
  trait_category text not null
    check (trait_category in ('value', 'personality', 'skill', 'role')),
  confidence float not null default 0.5
    check (confidence between 0 and 1),
  evidence_count int not null default 1,
  first_detected_at timestamptz not null default now(),
  last_reinforced_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  unique (user_id, trait_name)
);

alter table public.identity_traits enable row level security;

create policy "users can crud own traits"
  on public.identity_traits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.identity_traits (user_id, confidence desc);

-- ============================================================
-- BEHAVIORAL TAGS (per memory)
-- ============================================================
create table public.memory_behavioral_tags (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_name text not null,
  tag_category text not null
    check (tag_category in ('cognitive', 'emotional', 'relational', 'energy')),
  valence text not null
    check (valence in ('positive', 'negative', 'neutral')),
  intensity float not null
    check (intensity between 0 and 1),
  created_at timestamptz not null default now()
);

alter table public.memory_behavioral_tags enable row level security;

create policy "users can crud own behavioral tags"
  on public.memory_behavioral_tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.memory_behavioral_tags (user_id, tag_name);
create index on public.memory_behavioral_tags (memory_id);

-- ============================================================
-- EMOTIONAL EVENTS
-- ============================================================
create table public.emotional_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  emotion_primary text not null
    check (emotion_primary in ('joy', 'fear', 'anger', 'sadness', 'surprise', 'disgust', 'anticipation', 'trust')),
  emotion_secondary text,
  valence float not null
    check (valence between -1 and 1),
  arousal float not null
    check (arousal between 0 and 1),
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.emotional_events enable row level security;

create policy "users can crud own emotional events"
  on public.emotional_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.emotional_events (user_id, event_date desc);
create index on public.emotional_events (user_id, emotion_primary);

-- ============================================================
-- BEHAVIORAL PATTERNS
-- ============================================================
create table public.behavioral_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pattern_type text not null,
  pattern_description text not null,
  frequency_days int,
  confidence float not null
    check (confidence between 0 and 1),
  first_detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  evidence_memory_ids uuid[] not null default '{}'
);

alter table public.behavioral_patterns enable row level security;

create policy "users can crud own patterns"
  on public.behavioral_patterns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.behavioral_patterns (user_id, is_active, last_seen_at desc);

-- ============================================================
-- FUTURE SELF SIMULATIONS
-- ============================================================
create table public.future_self_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  horizon_months int not null
    check (horizon_months in (1, 3, 12, 36)),
  narrative text not null,
  letter_text text,
  trajectory_score float
    check (trajectory_score between 0 and 10),
  created_at timestamptz not null default now(),
  snapshot_identity jsonb not null default '{}',
  snapshot_behaviors jsonb not null default '{}'
);

alter table public.future_self_simulations enable row level security;

create policy "users can crud own simulations"
  on public.future_self_simulations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.future_self_simulations (user_id, created_at desc);

-- ============================================================
-- INTERVENTIONS / NUDGES
-- ============================================================
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trigger_pattern_id uuid references public.behavioral_patterns(id) on delete set null,
  intervention_text text not null,
  delivery_channel text not null default 'in-app'
    check (delivery_channel in ('in-app', 'push', 'email')),
  delivered_at timestamptz,
  user_response text
    check (user_response in ('dismissed', 'acted', 'saved'))
);

alter table public.interventions enable row level security;

create policy "users can crud own interventions"
  on public.interventions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.interventions (user_id, delivered_at desc);
