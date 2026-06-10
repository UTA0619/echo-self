-- ── IDENTITY SHARES ───────────────────────────────────────────────────────────
-- Shareable public snapshots of a user's identity nodes.
-- One per user (upsert on conflict). Accessed publicly by share_code.

CREATE TABLE IF NOT EXISTS identity_shares (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_code      TEXT        NOT NULL UNIQUE,
  nodes_snapshot  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)   -- one share link per user; upsert to refresh
);

CREATE INDEX IF NOT EXISTS identity_shares_code ON identity_shares (share_code);
CREATE INDEX IF NOT EXISTS identity_shares_user ON identity_shares (user_id);

-- ── REFERRALS — patch existing table ─────────────────────────────────────────
-- The initial schema has referrals(referrer_id, referred_id, referral_code, status).
-- App code queries: .eq('user_id', ...) and selects total_referrals,
-- successful_referrals, reward_months_earned.
-- Add missing columns + user_id alias so the app queries work correctly.

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS total_referrals      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_referrals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_months_earned INTEGER NOT NULL DEFAULT 0;

-- Back-fill user_id from referrer_id for existing rows
UPDATE referrals SET user_id = referrer_id WHERE user_id IS NULL;

-- Create index for the new user_id column
CREATE INDEX IF NOT EXISTS referrals_user_id ON referrals (user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE identity_shares ENABLE ROW LEVEL SECURITY;

-- identity_shares: public read (anyone with the code can view), owner manage
CREATE POLICY "Anyone can view identity shares"
  ON identity_shares FOR SELECT USING (true);

CREATE POLICY "Users can manage their identity share"
  ON identity_shares FOR ALL
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Service role manages identity shares"
  ON identity_shares FOR ALL USING (auth.role() = 'service_role');

-- ── Trigger: auto-insert referral row on new user ────────────────────────────

CREATE OR REPLACE FUNCTION create_referral_for_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO referrals (referrer_id, user_id, referral_code)
  VALUES (
    NEW.id,
    NEW.id,
    substr(md5(NEW.id::text || now()::text), 1, 8)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_create_referral
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_referral_for_new_user();
