// Client-safe subscription types and tier constants. Keep free of
// server-only imports — imported by Client Components (SettingsClient).
// The status fetcher lives in ./subscription-server.

export type SubscriptionTier = 'free' | 'premium'

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isPremium: boolean
  expiresAt: string | null
}

// Free tier limits
export const FREE_LIMITS = {
  entriesPerDay: 3,
  searchEnabled: false,
  futureSelfEnabled: false,
  identityWebEnabled: false,
  voiceEnabled: false,
} as const

export const PREMIUM_FEATURES = {
  entriesPerDay: Infinity,
  searchEnabled: true,
  futureSelfEnabled: true,
  identityWebEnabled: true,
  voiceEnabled: true,
} as const
