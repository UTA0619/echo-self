-- ── Patch notifications table ─────────────────────────────────────────────────
-- The initial schema (001) used `message` and `sent_at` but edge functions
-- (generate-daily-insight) reference `title`, `body`, and `created_at`.
-- Add the missing columns so both old and new code work.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title       TEXT,
  ADD COLUMN IF NOT EXISTS body        TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill: migrate existing `message` → `body` where body is null
UPDATE notifications
SET body = message
WHERE body IS NULL AND message IS NOT NULL;

-- Create index on created_at for the 23h de-duplication query
CREATE INDEX IF NOT EXISTS notifications_user_created
  ON notifications (user_id, type, created_at DESC);

-- ── RLS (notifications not previously protected) ──────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY IF NOT EXISTS "Service role manages notifications"
  ON notifications FOR ALL USING (auth.role() = 'service_role');

-- ── Notification preferences helper ──────────────────────────────────────────
-- Ensure profiles.notification_time column exists (added in 009, but guard it)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT TRUE;
