-- Migration 008: Auto-provision game records on new user signup
-- Triggered when a new row is inserted into auth.users

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_username  text;
begin
  -- Generate a unique username from the email prefix
  v_username := lower(split_part(new.email, '@', 1));
  -- Sanitize: keep only a-z0-9_
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '_', 'g');
  -- Ensure uniqueness with a suffix if needed
  if exists (select 1 from public.users where username = v_username) then
    v_username := v_username || '_' || floor(random() * 9000 + 1000)::text;
  end if;
  -- Clamp to 20 chars
  v_username := left(v_username, 20);

  -- Insert user record
  insert into public.users (auth_uid, username, language)
  values (new.id, v_username, coalesce(new.raw_user_meta_data->>'locale', 'en'))
  returning id into v_user_id;

  -- Insert free subscription
  insert into public.subscriptions (user_id, tier)
  values (v_user_id, 'free');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
