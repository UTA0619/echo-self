-- migration 017: analytics_events table + push_tokens cleanup
--
-- Adds the analytics_events table that analytics-events edge function writes to.
-- Also adds a unique constraint on push_tokens (user_id, expo_push_token) to
-- avoid duplicate token registrations.
--
-- Note: this migration is idempotent — safe to run multiple times.

-- ── analytics_events ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(auth_id) ON DELETE CASCADE,
  event       TEXT        NOT NULL,
  properties  JSONB       DEFAULT '{}',
  platform    TEXT,       -- 'ios' | 'android' | 'web'
  app_version TEXT,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-friendly index (user + time)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time
  ON analytics_events (user_id, created_at DESC);

-- Event name lookup (for dashboards)
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_time
  ON analytics_events (event, created_at DESC);

-- RLS: users can only read their own events; writes via service role only
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "analytics_events_select_own"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT policy — only the analytics-events edge function (service role) inserts

-- ── push_tokens dedup ─────────────────────────────────────────────────────

ALTER TABLE push_tokens
  ADD CONSTRAINT IF NOT EXISTS uq_push_token_user_token
  UNIQUE (user_id, expo_push_token);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_tokens (user_id);

-- ── users.auth_id index (used heavily by queries) ─────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id
  ON users (auth_id);

-- ── entries.user_id index ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_entries_user_created
  ON entries (user_id, created_at DESC);

-- ── memories.user_id index ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_memories_user_created
  ON memories (user_id, created_at DESC);

-- ── identity_nodes covering index ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_identity_nodes_user_active_confidence
  ON identity_nodes (user_id, active, confidence DESC);
