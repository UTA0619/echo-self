// Emotion types
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
  | 'awe';

export type VisualArchetype =
  | 'explorer'
  | 'sage'
  | 'creator'
  | 'hero'
  | 'caregiver'
  | 'rebel'
  | 'lover'
  | 'jester';

// Emotion analysis result from AI pipeline
export interface EmotionAnalysis {
  emotion: EmotionType;
  intensity: number;       // 0–1
  valence: number;         // -1 to 1 (negative to positive)
  arousal: number;         // 0 to 1 (calm to excited)
  secondary?: EmotionType[];
  themes?: string[];
  trigger_signals?: string[];
}

// Journal entry
export interface Entry {
  id: string;
  user_id: string;
  content: string;
  word_count: number;
  emotion_analysis: EmotionAnalysis | null;
  echo_response: string | null;
  created_at: string;
  updated_at: string;
}

// Memory vector record
export interface Memory {
  id: string;
  user_id: string;
  entry_id: string;
  content: string;
  memory_type: 'belief' | 'pattern' | 'value' | 'fear' | 'aspiration' | 'relationship' | 'insight';
  importance: number;       // 0–1
  emotion_tags: EmotionType[];
  themes: string[];
  embedding?: number[];     // 3072-dim vector (omitted in most queries)
  created_at: string;
}

// User profile
export interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  subscriptionTier: 'free' | 'premium';
  createdAt: string;
}

// Subscription record
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: 'monthly' | 'annual';
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// Future self prediction
export interface Prediction {
  id: string;
  user_id: string;
  timeframe: '30d' | '90d' | '365d';
  persona_name: string;
  persona_description: string;
  archetype: VisualArchetype;
  confidence_score: number;  // 0–1
  core_traits: string[];
  emotional_trajectory: EmotionType[];
  growth_areas: string[];
  risk_areas: string[];
  share_snippet: string;
  generated_at: string;
}

// Identity node
export interface IdentityNode {
  id: string;
  user_id: string;
  node_type: 'belief' | 'fear' | 'value' | 'pattern';
  label: string;
  description: string;
  polarity: 'positive' | 'negative' | 'neutral';
  confidence: number;       // 0–1
  evidence_count: number;
  first_seen: string;
  last_seen: string;
}

// Onboarding data stored in profile
export interface OnboardingData {
  selectedEmotions?: EmotionType[];
  goals?: string[];
  displayName?: string;
  notificationsEnabled?: boolean;
  stepCompleted: number;
}

// Referral record
export interface Referral {
  id: string;
  referrer_id: string;
  code: string;
  uses_count: number;
  max_uses: number;
  created_at: string;
}

// Push notification token
export interface NotificationToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
  created_at: string;
}
