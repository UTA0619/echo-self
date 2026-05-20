import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchEntries, countTodayEntries } from '@/lib/entries.server'
import { fetchIdentityNodes, fetchBehavioralPatterns } from '@/lib/identity'
import { fetchEmotionHistory } from '@/lib/emotions'
import { getSubscriptionStatus } from '@/lib/subscription'
import { DashboardClient } from './DashboardClient'

async function fetchReferralCode(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.referral_code ?? null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [entries, identityNodes, emotionHistory, behavioralPatterns, subscription, referralCode, todayCount] = await Promise.all([
    fetchEntries(20).catch(() => []),
    fetchIdentityNodes().catch(() => []),
    fetchEmotionHistory(30).catch(() => []),
    fetchBehavioralPatterns().catch(() => []),
    getSubscriptionStatus().catch(() => ({ tier: 'free' as const, isPremium: false, expiresAt: null })),
    fetchReferralCode(user.id).catch(() => null),
    countTodayEntries().catch(() => 0),
  ])

  return (
    <main className="min-h-screen max-w-xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-geist)' }}
        >
          ECHO
        </h1>
        <div className="flex items-center gap-3">
          {subscription.isPremium && (
            <span className="text-xs text-[#7B6CF6] font-medium">Pro</span>
          )}
          <a
            href="/wrapped"
            className="text-xs text-[#8B8FA8] hover:text-[#7B6CF6] transition-colors"
          >
            Wrapped ✦
          </a>
          <span className="text-xs text-[#8B8FA8]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </header>

      <DashboardClient
        initialEntries={entries}
        identityNodes={identityNodes}
        emotionHistory={emotionHistory}
        behavioralPatterns={behavioralPatterns}
        referralCode={referralCode}
        isPremium={subscription.isPremium}
        todayCount={todayCount}
      />
    </main>
  )
}
