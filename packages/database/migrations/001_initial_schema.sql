-- ══════════════════════════════════════════════════════════════════
-- ECHO//SELF — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ══════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── USERS ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT UNIQUE NOT NULL,
  display_name      TEXT,
  avatar_url        TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  current_streak    INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak    INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_entry_date   DATE,
  onboarding_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences       JSONB NOT NULL DEFAULT '{
    "notifications": true,
    "dailyTime": "09:00",
    "quietStart": "22:00",
    "quietEnd": "08:00",
    "darkMode": true,
    "haptics": true
  }'::jsonb,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_auth_id ON users(auth_id);
CREATE INDEX users_email ON users(email);
CREATE INDEX users_subscription ON users(subscription_tier);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ENTRIES ───────────────────────────────────────────────────────
CREATE TABLE entries (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  voice_url      TEXT,
  emotion        TEXT CHECK (emotion IN (
    'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
    'anticipation', 'trust', 'optimism', 'love', 'awe'
  )),
  emotion_score  FLOAT CHECK (emotion_score BETWEEN 0 AND 1),
  emotion_data   JSONB DEFAULT '{}'::jsonb,
  tags           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_response    TEXT,
  echo_rating    SMALLINT CHECK (echo_rating IN (-1, 1)),
  word_count     INTEGER GENERATED ALWAYS AS (
    array_length(string_to_array(trim(content), ' '), 1)
  ) STORED,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entries_user_created ON entries(user_id, created_at DESC);
CREATE INDEX entries_user_emotion ON entries(user_id, emotion);
CREATE INDEX entries_user_date ON entries(user_id, DATE(created_at));

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── MEMORIES (pgvector) ───────────────────────────────────────────
CREATE TABLE memories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id         UUID REFERENCES entries(id) ON DELETE SET NULL,
  content_chunk    TEXT NOT NULL,
  embedding        vector(3072) NOT NULL,
  emotion          TEXT,
  emotion_score    FLOAT CHECK (emotion_score BETWEEN 0 AND 1),
  tags             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  importance_score FLOAT NOT NULL DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
  memory_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  last_accessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX memories_user ON memories(user_id);
CREATE INDEX memories_user_date ON memories(user_id, memory_date DESC);
CREATE INDEX memories_importance ON memories(user_id, importance_score DESC);
-- Vector index (created after initial data load for performance)
CREATE INDEX memories_vector ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── PREDICTIONS ───────────────────────────────────────────────────
CREATE TABLE predictions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timeframe        TEXT NOT NULL CHECK (timeframe IN ('30d', '90d', '1yr')),
  persona_data     JSONB NOT NULL,
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  visual_archetype TEXT CHECK (visual_archetype IN (
    'visionary', 'healer', 'creator', 'rebel', 'sage', 'explorer', 'guardian', 'alchemist'
  )),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, timeframe)
);

CREATE INDEX predictions_user ON predictions(user_id);

-- ── EMOTION HISTORY ───────────────────────────────────────────────
CREATE TABLE emotion_history (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  emotion_counts  JSONB NOT NULL DEFAULT '{}'::jsonb,
  avg_valence     FLOAT CHECK (avg_valence BETWEEN 0 AND 1),
  entry_count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX emotion_history_user_date ON emotion_history(user_id, date DESC);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium_monthly', 'premium_annual')),
  status                  TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled')),
  trial_end               TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── NOTIFICATIONS ─────────────────────────────────────────────────
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  deep_link    TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at    TIMESTAMPTZ,
  onesignal_id TEXT
);

CREATE INDEX notifications_user_sent ON notifications(user_id, sent_at DESC);
CREATE INDEX notifications_unopened ON notifications(user_id, opened_at) WHERE opened_at IS NULL;

-- ── AI USAGE TRACKING ─────────────────────────────────────────────
CREATE TABLE ai_usage (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edge_function     TEXT NOT NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_cost_usd    NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_usage_user_date ON ai_usage(user_id, created_at DESC);
CREATE INDEX ai_usage_function ON ai_usage(edge_function, created_at DESC);

-- ── REFERRALS ─────────────────────────────────────────────────────
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id   UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX referrals_referrer ON referrals(referrer_id);
CREATE INDEX referrals_code ON referrals(referral_code);

-- ── WEEKLY SUMMARIES ──────────────────────────────────────────────
CREATE TABLE weekly_summaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  summary_text    TEXT NOT NULL,
  key_insights    JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- ════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = auth_id);

-- Entries
CREATE POLICY "entries_all_own" ON entries FOR ALL USING (user_id = current_user_id());

-- Memories: service role inserts (embedding pipeline), user reads
CREATE POLICY "memories_select_own" ON memories FOR SELECT USING (user_id = current_user_id());

-- Predictions
CREATE POLICY "predictions_all_own" ON predictions FOR ALL USING (user_id = current_user_id());

-- Emotion history
CREATE POLICY "emotion_history_all_own" ON emotion_history FOR ALL USING (user_id = current_user_id());

-- Subscriptions: user can read, service role writes
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (user_id = current_user_id());

-- Notifications
CREATE POLICY "notifications_all_own" ON notifications FOR ALL USING (user_id = current_user_id());

-- Referrals
CREATE POLICY "referrals_select_own" ON referrals FOR SELECT USING (referrer_id = current_user_id());
CREATE POLICY "referrals_insert_own" ON referrals FOR INSERT WITH CHECK (referrer_id = current_user_id());

-- Weekly summaries
CREATE POLICY "weekly_summaries_select_own" ON weekly_summaries FOR SELECT USING (user_id = current_user_id());

-- ════════════════════════════════════════════════════════════════════
-- STREAK UPDATE TRIGGER
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_streak_on_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID := NEW.user_id;
  v_today DATE := DATE(NOW() AT TIME ZONE (SELECT timezone FROM users WHERE id = v_user_id));
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_entry_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM users WHERE id = v_user_id;

  IF v_last_date = v_today THEN
    -- Already logged today, no change
    RETURN NEW;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak reset
    v_current_streak := 1;
  END IF;

  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  UPDATE users SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_entry_date = v_today
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER entries_update_streak
  AFTER INSERT ON entries
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_entry();
