-- ── Identity Shares ────────────────────────────────────────────────────────────
-- Public opt-in identity card sharing.
-- Users explicitly choose to share a snapshot of their top identity nodes.
-- The share is immutable — a new share is created each time the user shares.

CREATE TABLE IF NOT EXISTS identity_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  top_nodes    JSONB NOT NULL DEFAULT '[]',  -- Array of {type, label, confidence, polarity}
  share_text   TEXT,                          -- Optional 1-2 sentence summary
  is_public    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for public share lookups
CREATE INDEX IF NOT EXISTS identity_shares_public
  ON identity_shares (id) WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS identity_shares_user
  ON identity_shares (user_id, created_at DESC);

-- RLS: users can manage their own shares; public reads is_public rows
ALTER TABLE identity_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own shares"
  ON identity_shares FOR ALL
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY IF NOT EXISTS "Public can read public shares"
  ON identity_shares FOR SELECT
  USING (is_public = TRUE);
