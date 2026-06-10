/**
 * @echo-self/shared-types
 *
 * Canonical TypeScript types for the ECHO monorepo.
 * Do NOT redefine types that exist here — import from this package instead.
 *
 * Updated to match the current database schema as of migration 015.
 */

// ── Emotion ───────────────────────────────────────────────────────────────────

/** The 11 core emotions in ECHO's taxonomy (Plutchik wheel + compounds). */
export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'anticipation'
  | 'trust'
  | 'optimism'
  | 'love'
  | 'awe'
  | 'calm'
  | 'anxiety'
  | 'gratitude'
  | 'hope'
  | 'frustration'
  | 'neutral'

export type VisualArchetype =
  | 'explorer'
  | 'sage'
  | 'creator'
  | 'hero'
  | 'caregiver'
  | 'rebel'
  | 'lover'
  | 'jester'

/** Emotion analysis result from the AI pipeline (stored as JSONB in entries). */
export interface EmotionAnalysis {
  emotion:          EmotionType
  intensity:        number           // 0–1
  secondaryEmotion: EmotionType | null
  valence:          'positive' | 'negative' | 'neutral'
  themes:           string[]         // 3-5 specific themes
  summarySentence:  string
}

// ── Entries ───────────────────────────────────────────────────────────────────

/** Journal entry — matches the `entries` table. */
export interface Entry {
  id:           string
  user_id:      string
  content:      string
  word_count:   number
  emotion:      EmotionType | null
  emotion_data: EmotionAnalysis | null
  ai_response:  string | null
  created_at:   string
  updated_at:   string
}

// ── Memory ────────────────────────────────────────────────────────────────────

/** Memory vector record — matches the `memories` table. */
export interface Memory {
  id:              string
  user_id:         string
  source_entry_id: string | null
  content_chunk:   string
  importance:      number        // 0–1 (calculateImportanceScore output)
  created_at:      string
  // embedding omitted — 3072-dim vector, never sent to frontend
}

// ── Identity ──────────────────────────────────────────────────────────────────

/** Full identity node taxonomy (matches IDENTITY_TAXONOMY in ai-core). */
export type IdentityNodeType =
  | 'belief'
  | 'value'
  | 'core_fear'
  | 'core_desire'
  | 'behavioral_pattern'
  | 'relationship_pattern'
  | 'strength'

/** Identity node — matches the `identity_nodes` table. */
export interface IdentityNode {
  id:          string
  user_id:     string
  type:        IdentityNodeType
  label:       string
  description: string
  polarity:    'positive' | 'negative' | 'neutral'
  confidence:  number        // 0–1
  active:      boolean
  evidence:    string[]      // entry_ids that reinforced this node
  created_at:  string
  updated_at:  string
}

/** Behavioral pattern — matches the `behavioral_patterns` table. */
export interface BehavioralPattern {
  id:                   string
  user_id:              string
  pattern_type:         string
  pattern_description:  string
  frequency_days:       number
  confidence:           number    // 0–1
  trigger_tags:         string[]
  is_active:            boolean
  created_at:           string
}

// ── Future Self ───────────────────────────────────────────────────────────────

export type HorizonMonths = 1 | 3 | 12

/** Future self simulation — matches the `future_self_simulations` table. */
export interface FutureSelfSimulation {
  id:               string
  user_id:          string
  horizon_months:   HorizonMonths
  narrative:        string           // 3-4 sentence trajectory narrative
  letter_text:      string | null    // direct letter from future self
  trajectory_score: number | null    // 0–100 growth score
  created_at:       string
}

// ── User & Profile ────────────────────────────────────────────────────────────

/** Profile row (from `profiles` table — joined with `users` for display). */
export interface Profile {
  id:                   string
  auth_id:              string
  display_name:         string | null
  timezone:             string | null
  notification_time:    string | null   // e.g. "09:00:00"
  notification_enabled: boolean
  onboarding_data:      OnboardingData | null
  onboarding_done:      boolean
  streak_goal:          number
  created_at:           string
  updated_at:           string
}

/** User row from the `users` table. */
export interface User {
  id:                string
  auth_id:           string
  email:             string | null
  display_name:      string | null
  current_streak:    number
  longest_streak:    number
  subscription_tier: 'free' | 'premium'
  deleted_at:        string | null
  created_at:        string
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface Subscription {
  id:                      string
  user_id:                 string
  stripe_customer_id:      string
  stripe_subscription_id:  string
  status:                  'active' | 'canceled' | 'past_due' | 'trialing'
  plan:                    'premium_monthly' | 'premium_annual'
  current_period_end:      string | null
  cancel_at_period_end:    boolean
  created_at:              string
  updated_at:              string
}

export type SubscriptionTier = 'free' | 'premium'

// ── Crisis ────────────────────────────────────────────────────────────────────

export type CrisisSeverity = 'critical' | 'high' | 'medium' | 'low'

/** Crisis event — matches the `crisis_events` table (migration 012). */
export interface CrisisEvent {
  id:             string
  user_id:        string
  entry_id:       string | null
  severity:       CrisisSeverity
  trigger_phrase: string | null
  detected_tags:  string[]
  response_sent:  boolean
  resolved:       boolean
  resolved_by:    string | null
  resolved_at:    string | null
  notes:          string | null
  created_at:     string
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'daily_insight'
  | 'ai_push'
  | 'streak_reminder'
  | 'weekly_summary'
  | 'system'

/** Notification record — matches the `notifications` table. */
export interface Notification {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string | null
  body:       string | null
  message:    string | null    // legacy column (pre-migration 013)
  created_at: string
}

/** Push token record — matches `push_tokens` table. */
export interface PushToken {
  id:               string
  user_id:          string
  expo_push_token:  string
  platform:         'ios' | 'android'
  created_at:       string
}

// ── Onboarding ────────────────────────────────────────────────────────────────

/** Onboarding data stored as JSONB in profiles.onboarding_data. */
export interface OnboardingData {
  identityTags:          string[]        // e.g. ['ambitious', 'creative']
  aspirations:           string          // free-text life aspirations
  streakCommitment:      number          // days per week target
  selectedEmotions?:     EmotionType[]
  goals?:                string[]
  displayName?:          string
  notificationsEnabled?: boolean
  stepCompleted:         number
}

// ── Referrals ─────────────────────────────────────────────────────────────────

export interface Referral {
  id:                    string
  user_id:               string
  referral_code:         string
  total_referrals:       number
  successful_referrals:  number
  reward_months_earned:  number
  created_at:            string
}

// ── Identity Shares ───────────────────────────────────────────────────────────

/** Shared identity card snapshot (migration 015). */
export interface IdentityShare {
  id:           string
  user_id:      string
  display_name: string | null
  top_nodes:    Array<Pick<IdentityNode, 'type' | 'label' | 'confidence' | 'polarity'>>
  share_text:   string | null
  is_public:    boolean
  created_at:   string
}

// ── API response helpers ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
  code?: number
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

export function isApiError(result: ApiResult<unknown>): result is ApiError {
  return result.error !== null
}
