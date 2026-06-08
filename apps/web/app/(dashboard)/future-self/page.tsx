/**
 * Future Self — /future-self
 *
 * Full-page view of the user's future-self simulations:
 *  - 3 horizon tabs: 1 month / 3 months / 1 year
 *  - Trajectory score ring
 *  - Narrative + letter from future self
 *  - Trigger regeneration (Pro only)
 */
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/lib/subscription'
import { FutureSelfClient } from './FutureSelfClient'

export const metadata: Metadata = {
  title: 'Future Self — ECHO',
  description: 'Read letters from your future self and explore your trajectory across 1 month, 3 months, and 1 year.',
}

interface Simulation {
  id:               string
  horizon_months:   1 | 3 | 12
  narrative:        string
  letter_text:      string | null
  trajectory_score: number | null
  created_at:       string
}

export default async function FutureSelfPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [subscription, simsResult] = await Promise.all([
    getSubscriptionStatus().catch(() => ({ tier: 'free' as const, isPremium: false, expiresAt: null })),
    supabase
      .from('future_self_simulations')
      .select('id, horizon_months, narrative, letter_text, trajectory_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // Keep only the most recent simulation per horizon
  const simsByHorizon = new Map<number, Simulation>()
  for (const sim of (simsResult.data ?? []) as Simulation[]) {
    if (!simsByHorizon.has(sim.horizon_months)) {
      simsByHorizon.set(sim.horizon_months, sim)
    }
  }

  const simulations = Array.from(simsByHorizon.values()).sort(
    (a, b) => a.horizon_months - b.horizon_months,
  )

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="mb-1">
          <a href="/" className="text-[#8B8FA8] hover:text-white transition-colors text-sm">
            ← Dashboard
          </a>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Future Self</h1>
        <p className="text-[#8B8FA8] text-sm mt-1">
          AI-projected trajectories based on your identity patterns and memories
        </p>
      </header>

      <FutureSelfClient
        simulations={simulations}
        isPremium={subscription.isPremium}
      />
    </main>
  )
}
