// ECHO//SELF — Shared TypeScript types across all packages and apps

// ─── Emotion ─────────────────────────────────────────────────────────────────

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

export interface EmotionData {
  emotion: EmotionType
  intensity: number           // 0–1
  valence: number             // -1 (negative) to 1 (positive)
  arousal: number             // 0 (calm) to 1 (activated)
  secondary?: EmotionType[]
  themes?: string[]
  trigger_signals?: string[]
}

// ─── Visual archetype for Future Self persona ─────────────────────────────────

export type VisualArchetype =
  | 'visionary'
  | 'healer'
  | 'creator'
  | 'rebel'
  | 'sage'
  | 'explorer'
  | 'guardian'
  | 'alchemist'

// ─── Journal Entry (maps to `entries` table) ─────────────────────────────────

export interface Entry {
  id: string
  user_id: string
  content: string
  word_count: number | null
  emotion: string | null
  emotion_score: number | null
  emotion_data: EmotionData | null
  echo_rating: number | null
  ai_response: string | null
  tags: string[] | null
  is_voice: boolean
  created_at: string
  updated_at: string
}

// ─── Memory (maps to `memories` table) ───────────────────────────────────────

export interface Memory {
  id: string
  user_id: string
  entry_id: string
  content_chunk: string
  embedding?: number[]
  emotion: EmotionType | null
  emotion_score: number | null
  tags: string[]
  importance_score: number
  memory_date: string               // YYYY-MM-DD
  last_accessed_at: string | null
  similarity?: number               // present in RPC results
  created_at: string
}

// ─── User (maps to `users` table) ────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'premium' | 'trial'

export interface User {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  onboarding_completed: boolean
  onboarding_data: OnboardingData | null
  streak_count: number
  last_entry_at: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingData {
  name?: string
  emotions?: EmotionType[]
  goal?: 'understand_patterns' | 'predict_future' | 'process_feelings'
  notifications_enabled?: boolean
  step_completed?: number
}

// ─── Subscription (maps to `subscriptions` table) ────────────────────────────

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  plan: string | null
  cancel_at_period_end: boolean
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// ─── Future Self / Predictions ───────────────────────────────────────────────

export type PredictionTimeframe = '30d' | '90d' | '365d'

export interface IdentityNode {
  id: string
  type: 'belief' | 'fear' | 'value' | 'pattern'
  label: string
  description: string
  confidence: number    // 0–1
  polarity: 'positive' | 'negative' | 'neutral'
  evidence: string[]
}

export interface Prediction {
  id: string
  user_id: string
  timeframe: PredictionTimeframe
  persona_summary: string
  key_shifts: IdentityNode[]
  confidence_score: number
  emotional_trajectory: EmotionType[]
  share_snippet: string | null
  generated_at: string
  created_at: string
  updated_at: string
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  cursor: string | null
  has_more: boolean
}

export interface ApiError {
  error: string
  code?: string
  success: false
}
