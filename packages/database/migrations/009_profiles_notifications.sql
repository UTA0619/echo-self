-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- Extended user profile (separate from auth.users).
-- Stores display_name, timezone, onboarding data, push tokens, etc.
-- Referenced by edge functions, settings page, and identity prompts.

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auth_id           UUID        NOT NULL UNIQUE,  -- maps to auth.users.id
  display_name      TEXT,
  avatar_url        TEXT,
  timezone          TEXT        NOT NULL DEFAULT 'UTC',
  onboarding_data   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  onboarding_done   BOOLEAN     NOT NULL DEFAULT FALSE,
  notification_time TIME        NOT NULL DEFAULT '09:00:00',   -- daily reminder time
  streak_goal       INTEGER     NOT NULL DEFAULT 5,            -- days/week
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_auth_id ON profiles (auth_id);

-- ── PUSH NOTIFICATION TOKENS ──────────────────────────────────────────────────
-- Expo push tokens stored per device. One user can have multiple devices.

CREATE TABLE IF NOT EXISTS push_tokens (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT        NOT NULL,
  platform        TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user ON push_tokens (user_id);

-- ── ANALYTICS EVENTS ──────────────────────────────────────────────────────────
-- Server-side persisted events for internal SQL dashboards.
-- High-frequency events (page views, scroll) are NOT stored here.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  event       TEXT        NOT NULL,
  properties  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_user    ON analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event   ON analytics_events (event, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Service role manages profiles"
  ON profiles FOR ALL USING (auth.role() = 'service_role');

-- push_tokens
CREATE POLICY "Users can manage their push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Service role manages push tokens"
  ON push_tokens FOR ALL USING (auth.role() = 'service_role');

-- analytics_events: write-only for users, read for service role
CREATE POLICY "Service role reads analytics"
  ON analytics_events FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role inserts analytics"
  ON analytics_events FOR INSERT USING (auth.role() = 'service_role');

-- ── Trigger: auto-create profile on user insert ───────────────────────────────

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, auth_id)
  VALUES (NEW.id, NEW.auth_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_create_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- updated_at trigger for profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
