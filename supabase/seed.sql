-- ============================================================================
-- ECHO//SELF — Development Seed Data
-- Run: supabase db seed --local
-- WARNING: Development use only. Never run on production.
-- ============================================================================

-- Create test users (Supabase local dev creates these via Auth API in practice)
-- These are inserted directly for seed convenience only

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_user2_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN

-- ── Seed User 1: Maya (power user with rich data) ─────────────────────────

INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES (v_user_id, 'maya@test.echoself.app', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET
  display_name = 'Maya',
  timezone = 'America/New_York',
  onboarding_completed = true,
  onboarding_data = '{"emotion": "anxious", "goal": "understand my patterns", "step_completed": 5}',
  current_streak = 12,
  longest_streak = 23,
  total_entries = 35,
  total_echo_sessions = 8
WHERE id = v_user_id;

-- Journal entries for Maya
INSERT INTO journal_entries (user_id, content, emotions, ai_processed, ai_processed_at, created_at)
VALUES
  (v_user_id, 'I keep saying yes to things I don''t want to do. Three times this week I agreed to help colleagues with work that isn''t mine, and now I''m staying late again. I know why I do it — I''m terrified of being seen as selfish. But I end up resenting them, and myself.', '{"primary": {"emotion": "anger", "intensity": 0.7}, "secondary": [{"emotion": "fear", "intensity": 0.8}], "valence": -0.6, "themes": ["boundaries", "people-pleasing", "resentment"]}', true, NOW(), NOW() - INTERVAL '2 days'),
  (v_user_id, 'Had a really productive morning. Finished the project report before noon and actually felt proud of myself. Then immediately undermined it by thinking "anyone could have done this." Why do I do that? It''s like I''m not allowed to just feel good about something.', '{"primary": {"emotion": "joy", "intensity": 0.5}, "secondary": [{"emotion": "sadness", "intensity": 0.4}], "valence": 0.1, "themes": ["self-sabotage", "achievement", "imposter syndrome"]}', true, NOW(), NOW() - INTERVAL '1 day'),
  (v_user_id, 'Called my mom today. We talked for 45 minutes and I hung up feeling completely drained. She doesn''t do anything wrong exactly, but I always feel like I disappear in those conversations. Like I become 12 again, managing her emotions instead of having my own.', '{"primary": {"emotion": "sadness", "intensity": 0.6}, "secondary": [{"emotion": "anger", "intensity": 0.3}], "valence": -0.5, "themes": ["family", "identity", "emotional labor"]}', true, NOW(), NOW() - INTERVAL '3 days');

-- Memories for Maya
INSERT INTO memories (user_id, content, type, emotion, confidence, tags, source_entry_id, created_at)
VALUES
  (v_user_id, 'Maya consistently agrees to commitments she doesn''t want because she fears being perceived as selfish', 'behavioral_pattern', 'fear', 0.9, ARRAY['people-pleasing', 'boundaries'], (SELECT id FROM journal_entries WHERE user_id = v_user_id LIMIT 1), NOW() - INTERVAL '2 days'),
  (v_user_id, 'Maya has a deep fear of being seen as selfish', 'core_fear', 'fear', 0.85, ARRAY['self-perception', 'approval-seeking'], (SELECT id FROM journal_entries WHERE user_id = v_user_id LIMIT 1), NOW() - INTERVAL '2 days'),
  (v_user_id, 'Maya invalidates her own achievements by immediately attributing them to luck or minimal effort', 'behavioral_pattern', 'sadness', 0.8, ARRAY['self-sabotage', 'imposter-syndrome'], (SELECT id FROM journal_entries WHERE user_id = v_user_id LIMIT 1 OFFSET 1), NOW() - INTERVAL '1 day'),
  (v_user_id, 'Maya loses her sense of identity in conversations with her mother, reverting to emotional caretaking', 'relationship_pattern', 'sadness', 0.75, ARRAY['family', 'identity', 'enmeshment'], (SELECT id FROM journal_entries WHERE user_id = v_user_id LIMIT 1 OFFSET 2), NOW() - INTERVAL '3 days');

-- Identity nodes for Maya
INSERT INTO identity_nodes (user_id, type, label, description, evidence, confidence, polarity)
VALUES
  (v_user_id, 'core_fear', 'Fear of Being Seen as Selfish', 'Consistently prioritizes others'' needs at expense of own wellbeing to avoid this perception', ARRAY['Agreed to three unwanted commitments this week', 'Stays late to help others despite own workload'], 0.9, 'negative'),
  (v_user_id, 'behavioral_pattern', 'Achievement Minimization', 'Systematically discounts own accomplishments immediately after achieving them', ARRAY['Attributed project success to generic ability', 'Self-described as undeserving of feeling good'], 0.8, 'negative'),
  (v_user_id, 'value', 'Desire for Authentic Self-Expression', 'Deep underlying desire to have her own emotions and identity, separate from others'' needs', ARRAY['Frustration at losing identity in family conversations', 'Awareness of people-pleasing pattern'], 0.7, 'positive');

-- Subscription for Maya (Pro)
UPDATE subscriptions SET
  plan = 'pro',
  status = 'active',
  entries_this_month = 12
WHERE user_id = v_user_id;

-- ── Seed User 2: Jordan (new user, just started) ──────────────────────────

INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES (v_user2_id, 'jordan@test.echoself.app', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET
  display_name = 'Jordan',
  timezone = 'America/Los_Angeles',
  onboarding_completed = true,
  onboarding_data = '{"emotion": "curious", "goal": "understand why I keep self-sabotaging", "step_completed": 5}',
  current_streak = 2,
  total_entries = 3
WHERE id = v_user2_id;

-- Jordan is on free tier (default subscription)

END $$;

-- ── Summary ───────────────────────────────────────────────────────────────

SELECT 'Seed complete' AS status,
  (SELECT COUNT(*) FROM profiles) AS total_profiles,
  (SELECT COUNT(*) FROM journal_entries) AS total_entries,
  (SELECT COUNT(*) FROM memories) AS total_memories,
  (SELECT COUNT(*) FROM identity_nodes) AS total_identity_nodes,
  (SELECT COUNT(*) FROM subscriptions) AS total_subscriptions;
