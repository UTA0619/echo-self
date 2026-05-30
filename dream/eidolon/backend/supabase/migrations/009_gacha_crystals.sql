-- Migration 009: Add soul_crystals to users + deduct_crystals RPC

alter table public.users
  add column if not exists soul_crystals integer not null default 500
    constraint soul_crystals_non_negative check (soul_crystals >= 0);

-- Atomic crystal deduction with row-level lock.
-- Raises P0001 if balance is insufficient, P0002 if user not found.
create or replace function public.deduct_crystals(
  p_user_id uuid,
  p_amount   integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
begin
  select soul_crystals into v_current
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if v_current < p_amount then
    raise exception 'insufficient crystals: have %, need %', v_current, p_amount
      using errcode = 'P0001';
  end if;

  update public.users
  set soul_crystals = soul_crystals - p_amount
  where id = p_user_id;
end;
$$;

grant execute on function public.deduct_crystals(uuid, integer) to authenticated;

-- Atomic crystal credit (called after successful IAP receipt validation).
-- p_receipt_id is stored for idempotency — duplicate receipts are silently ignored.
create table if not exists public.crystal_receipts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  receipt_id  text not null unique,
  amount      integer not null,
  credited_at timestamptz not null default now()
);

alter table public.crystal_receipts enable row level security;
create policy "crystal_receipts_service_all" on public.crystal_receipts
  for all using (true) with check (true);

create or replace function public.credit_crystals(
  p_user_id   uuid,
  p_amount    integer,
  p_receipt_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotency: if this receipt was already processed, do nothing
  if exists (select 1 from public.crystal_receipts where receipt_id = p_receipt_id) then
    return;
  end if;

  insert into public.crystal_receipts (user_id, receipt_id, amount)
  values (p_user_id, p_receipt_id, p_amount);

  update public.users
  set soul_crystals = soul_crystals + p_amount
  where id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.credit_crystals(uuid, integer, text) to authenticated;
