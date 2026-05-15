import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '../types/database.js'

type Subscription = Tables<'subscriptions'>

export const FREE_TIER_LIMITS = {
  entries_per_month: 7,
  echo_sessions_per_month: 3,
} as const

/**
 * Get the current subscription for a user.
 * Always reads from DB — never trust client-reported plan.
 */
export async function getSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * Check if a user can create a new journal entry this month.
 * Uses the DB-side can_create_journal_entry() function to enforce limits.
 */
export async function canCreateJournalEntry(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_create_journal_entry', {
    p_user_id: userId,
  })

  if (error) throw new Error(`canCreateJournalEntry failed: ${error.message}`)
  return data ?? false
}

/**
 * Check if a user is on an active Pro or trialing plan.
 */
export function isPro(subscription: Subscription | null): boolean {
  if (!subscription) return false
  return (
    subscription.plan === 'pro' &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  )
}

/**
 * Get days remaining in trial. Returns null if not trialing.
 */
export function getTrialDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription?.trial_ends_at) return null
  if (subscription.status !== 'trialing') return null

  const ms = new Date(subscription.trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
