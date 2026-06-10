-- identity_shares: public shareable identity portraits
create table if not exists public.identity_shares (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  share_code     text not null,
  nodes_snapshot jsonb not null default '[]',
  view_count     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id),
  unique (share_code)
);
create index on public.identity_shares (share_code);
alter table public.identity_shares enable row level security;
create policy "public can read identity shares" on public.identity_shares for select using (true);
create policy "users manage own identity shares" on public.identity_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- referrals: viral referral tracking.
-- 004_identity_monetization created an earlier referrer/referred-pair model
-- (referrer_id/referred_id) that the application never adopted — it reads the
-- per-user referral-code model below (referrals.user_id + referral_code). Drop
-- the superseded table so this authoritative definition applies cleanly.
drop table if exists public.referrals cascade;
create table public.referrals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  referral_code        text not null,
  total_referrals      int not null default 0,
  successful_referrals int not null default 0,
  reward_months_earned int not null default 0,
  created_at           timestamptz not null default now(),
  unique (user_id),
  unique (referral_code)
);
create index on public.referrals (referral_code);
alter table public.referrals enable row level security;
create policy "users see own referrals" on public.referrals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- referral_events: each referral signup
create table if not exists public.referral_events (
  id               uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  referral_code    text not null,
  status           text not null default 'signed_up' check (status in ('signed_up','activated','rewarded')),
  created_at       timestamptz not null default now()
);
alter table public.referral_events enable row level security;
create policy "users see own referral events" on public.referral_events for select using (auth.uid() = referrer_user_id);
