import { createClient } from '@/lib/supabase/server'

export type SubscriptionTier = 'free' | 'premium'

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isPremium: boolean
  expiresAt: string | null
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { tier: 'free', isPremium: false, expiresAt: null }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) return { tier: 'free', isPremium: false, expiresAt: null }

  return {
    tier: 'premium',
    isPremium: true,
    expiresAt: sub.current_period_end ?? null,
  }
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
