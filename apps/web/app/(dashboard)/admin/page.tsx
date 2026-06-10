import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  fetchAdminKPIs,
  fetchRecentUsers,
  fetchRecentEntries,
  fetchRecentCrisisEvents,
} from '@/lib/admin-data'
import { AdminDashboardClient } from './AdminDashboardClient'

// Comma-separated list of admin emails, e.g.:
//   ADMIN_EMAILS=alice@example.com,bob@example.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const metadata = { title: 'Admin — ECHO' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Must be authenticated
  if (!user) redirect('/auth')

  // Must be an admin
  const email = user.email?.toLowerCase() ?? ''
  const isAdmin = ADMIN_EMAILS.includes(email) || email.endsWith('@echo-self.app')
  if (!isAdmin) redirect('/')

  // Fetch all admin data in parallel
  const [kpis, recentUsers, recentEntries, crisisEvents] = await Promise.all([
    fetchAdminKPIs().catch(() => ({
      totalUsers: 0, usersToday: 0, usersThisWeek: 0, premiumUsers: 0,
      totalEntries: 0, entriesToday: 0, entriesThisWeek: 0, avgEntriesPerUser: 0,
      totalMemories: 0, crisisEventsTotal: 0, crisisEventsThisWeek: 0, pushTokensTotal: 0,
    })),
    fetchRecentUsers(25).catch(() => []),
    fetchRecentEntries(20).catch(() => []),
    fetchRecentCrisisEvents(20).catch(() => []),
  ])

  const lastRefreshed = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-[#8B8FA8] hover:text-white text-sm transition-colors"
              >
                ← App
              </a>
              <span className="text-[#2A2D3E]">/</span>
              <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
            </div>
            <p className="text-[11px] text-[#4B4F6B] mt-1">
              Refreshed {lastRefreshed} · {user.email}
            </p>
          </div>

          {/* Quick links */}
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="/admin/users"
              className="text-[#8B8FA8] hover:text-[#7B6CF6] transition-colors"
            >
              All users
            </a>
            <a
              href="/admin/crisis"
              className="text-[#8B8FA8] hover:text-[#EF4444] transition-colors"
            >
              Crisis events
            </a>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B8FA8] hover:text-[#7B6CF6] transition-colors"
            >
              Supabase ↗
            </a>
            <a
              href="https://dashboard.posthog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B8FA8] hover:text-[#7B6CF6] transition-colors"
            >
              PostHog ↗
            </a>
          </nav>
        </header>

        {/* Dashboard */}
        <AdminDashboardClient
          kpis={kpis}
          recentUsers={recentUsers}
          recentEntries={recentEntries}
          crisisEvents={crisisEvents}
        />
      </div>
    </div>
  )
}
