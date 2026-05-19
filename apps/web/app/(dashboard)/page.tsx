import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchEntries } from '@/lib/entries'
import { fetchIdentityNodes } from '@/lib/identity'
import { fetchEmotionHistory } from '@/lib/emotions'
import { getSubscriptionStatus } from '@/lib/subscription'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [entries, identityNodes, emotionHistory, subscription] = await Promise.all([
    fetchEntries(20).catch(() => []),
    fetchIdentityNodes().catch(() => []),
    fetchEmotionHistory(30).catch(() => []),
    getSubscriptionStatus().catch(() => ({ tier: 'free' as const, isPremium: false, expiresAt: null })),
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
          <span className="text-xs text-[#8B8FA8]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </header>

      <DashboardClient
        initialEntries={entries}
        identityNodes={identityNodes}
        emotionHistory={emotionHistory}
        isPremium={subscription.isPremium}
      />
    </main>
  )
}
