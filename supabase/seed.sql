-- ============================================================================
-- ECHO//SELF — Development Seed Data (auth-id schema)
-- Run locally via `supabase db reset`. Development use only — never on prod.
--
-- Model: insert into auth.users → the on_auth_user_created trigger provisions
-- public.users + public.profiles rows → we then enrich them. Every user_id is
-- the auth user id.
-- ============================================================================

DO $$
DECLARE
  v_user_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_user2_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN

-- ── Seed User 1: Maya (power user with rich data) ────────────────────────────
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES (v_user_id, 'maya@test.echoself.app', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Trigger created users + profiles; enrich them.
UPDATE public.users SET
  display_name      = 'Maya',
  timezone          = 'America/New_York',
  subscription_tier = 'premium',
  current_streak    = 12,
  longest_streak    = 23,
  total_entries     = 3
WHERE id = v_user_id;

UPDATE public.profiles SET
  display_name    = 'Maya',
  timezone        = 'America/New_York',
  onboarding_done = true,
  onboarding_data = '{"emotion": "anxious", "goal": "understand my patterns", "step_completed": 5}'
WHERE id = v_user_id;

INSERT INTO public.entries (user_id, content, emotion, emotion_score, ai_response, created_at)
VALUES
  (v_user_id, 'I keep saying yes to things I don''t want to do. Three times this week I agreed to help colleagues with work that isn''t mine, and now I''m staying late again. I know why — I''m terrified of being seen as selfish. But I end up resenting them, and myself.',
   'anger', 0.7, 'The frustration is pointing at something you value: your own time. Naming the fear underneath — being seen as selfish — is already the work.', NOW() - INTERVAL '2 days'),
  (v_user_id, 'Had a really productive morning. Finished the project report before noon and actually felt proud. Then immediately undermined it by thinking "anyone could have done this." Why do I do that?',
   'joy', 0.5, 'You let yourself feel good — then took it back. Remember this one; the pride was real before the second thought arrived.', NOW() - INTERVAL '1 day'),
  (v_user_id, 'Called my mom today. We talked for 45 minutes and I hung up feeling completely drained. She doesn''t do anything wrong exactly, but I always feel like I disappear in those conversations.',
   'sadness', 0.6, 'This sounds heavy to carry. The pattern of disappearing to manage someone else''s emotions is worth watching.', NOW() - INTERVAL '3 days');

INSERT INTO public.identity_nodes (user_id, type, label, description, evidence, confidence, polarity)
VALUES
  (v_user_id, 'core_fear', 'Fear of being seen as selfish', 'Prioritizes others'' needs at the expense of her own to avoid this perception.',
   ARRAY['Agreed to three unwanted commitments this week', 'Stays late to help others despite own workload'], 0.9, 'negative'),
  (v_user_id, 'behavioral_pattern', 'Achievement minimization', 'Discounts her own accomplishments immediately after achieving them.',
   ARRAY['Attributed project success to generic ability'], 0.8, 'negative'),
  (v_user_id, 'value', 'Authentic self-expression', 'A deep desire to have her own emotions and identity, separate from others'' needs.',
   ARRAY['Frustration at losing identity in family conversations'], 0.7, 'positive');

INSERT INTO public.identity_traits (user_id, trait_name, trait_category, confidence, evidence_count, metadata)
VALUES (v_user_id, 'growth', 'value', 0.8, 1, '{"source": "seed"}');

INSERT INTO public.subscriptions (user_id, plan, status)
VALUES (v_user_id, 'premium_monthly', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.referrals (user_id, referral_code)
VALUES (v_user_id, 'ECHO-MAYA01')
ON CONFLICT (user_id) DO NOTHING;

-- ── Seed User 2: Jordan (new user, just started) ─────────────────────────────
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES (v_user2_id, 'jordan@test.echoself.app', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE public.users SET
  display_name   = 'Jordan',
  timezone       = 'America/Los_Angeles',
  current_streak = 2,
  total_entries  = 1
WHERE id = v_user2_id;

UPDATE public.profiles SET
  display_name    = 'Jordan',
  timezone        = 'America/Los_Angeles',
  onboarding_done = true,
  onboarding_data = '{"emotion": "curious", "goal": "understand why I keep self-sabotaging", "step_completed": 5}'
WHERE id = v_user2_id;

INSERT INTO public.entries (user_id, content, emotion, emotion_score, created_at)
VALUES (v_user2_id, 'First entry. Not sure what to write, but I want to understand why I keep starting things and stopping.', 'anticipation', 0.5, NOW());

END $$;

-- ── Summary ──────────────────────────────────────────────────────────────────
SELECT 'Seed complete' AS status,
  (SELECT COUNT(*) FROM public.users)          AS users,
  (SELECT COUNT(*) FROM public.entries)         AS entries,
  (SELECT COUNT(*) FROM public.identity_nodes)  AS identity_nodes,
  (SELECT COUNT(*) FROM public.subscriptions)   AS subscriptions;
