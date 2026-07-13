-- ============================================================================
-- ECHO//SELF — Migration 004: Identity, Echo Sessions, Monetization, Growth
-- ============================================================================

-- ============================================================================
-- IDENTITY NODES
-- ============================================================================

CREATE TABLE identity_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'value', 'core_fear', 'core_desire', 'strength',
    'behavioral_pattern', 'limiting_belief', 'relationship_pattern'
  )),
  label TEXT NOT NULL,
  description TEXT,
  evidence TEXT[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  polarity TEXT DEFAULT 'neutral' CHECK (polarity IN ('positive', 'negative', 'neutral')),
  active BOOLEAN DEFAULT true,
  user_challenged BOOLEAN DEFAULT false,
  challenged_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX identity_nodes_user_idx
  ON identity_nodes (user_id, confidence DESC)
  WHERE active = true;

ALTER TABLE identity_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own identity"
  ON identity_nodes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users update own identity"
  ON identity_nodes FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- FUTURE SELF PREDICTIONS
-- ============================================================================

CREATE TABLE future_self_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('30d', '90d', '365d')),
  headline TEXT NOT NULL,
  narrative TEXT NOT NULL,
  opportunity TEXT,
  risk TEXT,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  share_snippet TEXT,  -- safe-to-share excerpt (no PII)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_prediction_per_timeframe UNIQUE (user_id, timeframe)
);

ALTER TABLE future_self_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own predictions"
  ON future_self_predictions FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- ECHO SESSIONS
-- ============================================================================

CREATE TABLE echo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT,
  session_insight TEXT,
  memory_context_ids UUID[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES journal_entries(id)
);

CREATE INDEX echo_sessions_user_idx ON echo_sessions (user_id, started_at DESC);

ALTER TABLE echo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own sessions"
  ON echo_sessions FOR SELECT USING (user_id = auth.uid());

CREATE TABLE echo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES echo_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX echo_messages_session_idx ON echo_messages (session_id, created_at ASC);

ALTER TABLE echo_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own messages"
  ON echo_messages FOR SELECT USING (user_id = auth.uid());

-- Increment echo session count on profile
CREATE OR REPLACE FUNCTION increment_session_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET total_echo_sessions = total_echo_sessions + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_echo_session_created
  AFTER INSERT ON echo_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_session_count();

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete'
  )),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  entries_this_month INTEGER DEFAULT 0,
  echo_sessions_this_month INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own subscription"
  ON subscriptions FOR SELECT USING (user_id = auth.uid());
-- Service role manages writes (Stripe webhook handler)

-- Auto-create free subscription on user signup
CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_subscription();

-- Feature access check function
CREATE OR REPLACE FUNCTION can_create_journal_entry(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN s.plan = 'pro' AND s.status IN ('active', 'trialing') THEN true
      WHEN s.entries_this_month < 7 THEN true
      ELSE false
    END
  FROM subscriptions s
  WHERE s.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION can_create_journal_entry TO authenticated;

-- ============================================================================
-- REFERRALS
-- ============================================================================

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  install_source TEXT,
  status TEXT DEFAULT 'signed_up' CHECK (status IN (
    'signed_up', 'trialed', 'converted', 'rewarded'
  )),
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  reward_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_referral_pair UNIQUE (referrer_id, referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT,
  streak_reminders BOOLEAN DEFAULT true,
  insight_ready BOOLEAN DEFAULT true,
  future_self_checkin BOOLEAN DEFAULT true,
  re_engagement BOOLEAN DEFAULT true,
  preferred_send_hour INTEGER CHECK (preferred_send_hour >= 0 AND preferred_send_hour <= 23),
  optimal_send_hour INTEGER,
  optimal_send_hour_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own notification preferences"
  ON notification_preferences USING (user_id = auth.uid());

-- Auto-create notification preferences on signup
CREATE OR REPLACE FUNCTION handle_new_notification_prefs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_notification_prefs();
