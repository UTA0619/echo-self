// ─── User & Auth ──────────────────────────────────────────────────
export interface User {
  id: string
  authId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  subscriptionTier: 'free' | 'premium'
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
  onboardingData: OnboardingData
  preferences: UserPreferences
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface OnboardingData {
  identityTags: string[]
  aspirations: string
  voiceAspirationsUrl?: string
  reflectionTime: string
  streakCommitment: number
  completed: boolean
}

export interface UserPreferences {
  notifications: boolean
  dailyTime: string
  quietStart: string
  quietEnd: string
  darkMode: boolean
  haptics: boolean
}

// ─── Entries ──────────────────────────────────────────────────────
export interface Entry {
  id: string
  userId: string
  content: string
  voiceUrl: string | null
  emotion: EmotionType | null
  emotionScore: number | null
  emotionData: EmotionAnalysis | null
  tags: string[]
  aiResponse: string | null
  echoRating: -1 | 1 | null
  wordCount: number
  createdAt: string
  updatedAt: string
}

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

export interface EmotionAnalysis {
  emotion: EmotionType
  intensity: number
  secondaryEmotion?: EmotionType
  valence: 'positive' | 'negative' | 'neutral'
  themes: string[]
  summarySentence: string
}

// ─── Memory ───────────────────────────────────────────────────────
export interface Memory {
  id: string
  userId: string
  entryId: string | null
  contentChunk: string
  emotion: EmotionType | null
  emotionScore: number | null
  tags: string[]
  importanceScore: number
  memoryDate: string
  lastAccessedAt: string | null
  createdAt: string
}

// ─── Predictions ──────────────────────────────────────────────────
export type PredictionTimeframe = '30d' | '90d' | '1yr'

export type VisualArchetype =
  | 'visionary'
  | 'healer'
  | 'creator'
  | 'rebel'
  | 'sage'
  | 'explorer'
  | 'guardian'
  | 'alchemist'

export interface Prediction {
  id: string
  userId: string
  timeframe: PredictionTimeframe
  personaData: PersonaData
  confidenceScore: number
  visualArchetype: VisualArchetype
  generatedAt: string
}

export interface PersonaData {
  personaName: string
  description: string
  keyTraitShifts: string[]
  confidenceScore: number
  visualArchetype: VisualArchetype
}

// ─── Subscription ─────────────────────────────────────────────────
export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  plan: 'free' | 'premium_monthly' | 'premium_annual'
  status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled'
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

// ─── API Types ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface EchoRequest {
  entryId: string
  content: string
  emotion: EmotionType | null
  emotionScore: number | null
}

export interface MemoryRetrieveRequest {
  queryText: string
  limit?: number
  emotionFilter?: EmotionType
  minImportance?: number
}

export interface MemoryRetrieveResult {
  memories: Array<Memory & { similarityScore: number }>
}

export interface FutureSelfRequest {
  timeframe: PredictionTimeframe
}

export interface EmotionHistoryPoint {
  date: string
  emotionCounts: Record<EmotionType, number>
  avgValence: number
  entryCount: number
}

// ─── Notification ─────────────────────────────────────────────────
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  deepLink: string | null
  sentAt: string
  openedAt: string | null
  onesignalId: string | null
}

export type NotificationType =
  | 'daily_prompt'
  | 'weekly_summary'
  | 'streak_reminder'
  | 'prediction_ready'
  | 're_engagement'
  | 'streak_milestone'

// ─── Referral ─────────────────────────────────────────────────────
export interface Referral {
  id: string
  referrerId: string
  referredId: string | null
  referralCode: string
  status: 'pending' | 'completed' | 'rewarded'
  createdAt: string
}
