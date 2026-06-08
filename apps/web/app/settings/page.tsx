import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSubscriptionStatus } from '@/lib/subscription'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [subscription, { upgrade }] = await Promise.all([
    getSubscriptionStatus().catch(() => ({ tier: 'free' as const, isPremium: false, expiresAt: null })),
    searchParams,
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone, notification_time, notification_enabled, created_at')
    .eq('auth_id', user.id)
    .maybeSingle()

  const { data: referral } = await supabase
    .from('referrals')
    .select('referral_code, total_referrals, successful_referrals, reward_months_earned')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[#0A0B0F] max-w-xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <a href="/" className="text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors text-sm">
          ← Back
        </a>
        <h1 className="text-lg font-semibold text-[#F0F0F5]">Settings</h1>
      </header>

      <SettingsClient
        user={{ id: user.id, email: user.email ?? '' }}
        profile={profile ?? null}
        subscription={subscription}
        referral={referral ?? null}
        upgradeStatus={upgrade ?? null}
      />
    </main>
  )
}
