// Server-only subscription status access. Uses the server Supabase client
// (next/headers cookies) — never import from a Client Component.
import { createClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/lib/subscription'

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
