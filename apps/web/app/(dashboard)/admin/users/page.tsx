import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Users — Admin — ECHO' }

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

interface FullUser {
  id: string
  email: string | null
  display_name: string | null
  subscription_tier: string
  current_streak: number
  longest_streak: number
  total_entries: number
  onboarding_done: boolean
  created_at: string
  last_entry_date: string | null
}

async function fetchAllUsers(): Promise<FullUser[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      display_name,
      subscription_tier,
      current_streak,
      longest_streak,
      total_entries,
      created_at,
      last_entry_date,
      profiles ( onboarding_done )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/users] fetch error:', error)
    return []
  }

  return (data ?? []).map((u: {
    id: string;
    email: string | null;
    display_name: string | null;
    subscription_tier: string;
    current_streak: number;
    longest_streak: number;
    total_entries: number;
    created_at: string;
    last_entry_date: string | null;
    profiles: { onboarding_done: boolean } | null;
  }) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    subscription_tier: u.subscription_tier,
    current_streak: u.current_streak ?? 0,
    longest_streak: u.longest_streak ?? 0,
    total_entries: u.total_entries ?? 0,
    onboarding_done: u.profiles?.onboarding_done ?? false,
    created_at: u.created_at,
    last_entry_date: u.last_entry_date,
  }))
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const email = user.email?.toLowerCase() ?? ''
  const isAdmin = ADMIN_EMAILS.includes(email) || email.endsWith('@echo-self.app')
  if (!isAdmin) redirect('/')

  const users = await fetchAllUsers()

  const premiumCount  = users.filter(u => u.subscription_tier === 'premium').length
  const onboardedPct  = users.length > 0
    ? Math.round((users.filter(u => u.onboarding_done).length / users.length) * 100)
    : 0
  const activeThisWeek = users.filter(u => {
    if (!u.last_entry_date) return false
    const d = new Date(u.last_entry_date)
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-[#8B8FA8] hover:text-white text-sm transition-colors">← App</a>
              <span className="text-[#2A2D3E]">/</span>
              <a href="/admin" className="text-[#8B8FA8] hover:text-white text-sm transition-colors">Admin</a>
              <span className="text-[#2A2D3E]">/</span>
              <h1 className="text-xl font-semibold tracking-tight">Users</h1>
            </div>
            <p className="text-[11px] text-[#4B4F6B] mt-1">
              {users.length} users · {premiumCount} Pro · {onboardedPct}% onboarded · {activeThisWeek} active this week
            </p>
          </div>
        </header>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',          value: users.length },
            { label: 'Pro',            value: premiumCount },
            { label: 'Onboarded',      value: `${onboardedPct}%` },
            { label: 'Active (7d)',     value: activeThisWeek },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-[#141620] border border-[#1E2030] rounded-xl p-4"
            >
              <p className="text-[11px] text-[#8B8FA8] uppercase tracking-widest font-medium">{label}</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1E2030]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#141620] text-[#8B8FA8] text-[11px] uppercase tracking-wider">
              <tr>
                {['Name', 'Email', 'Plan', 'Streak', 'Entries', 'Onboarded', 'Last active', 'Joined'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2030]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#141620]/60 transition-colors">
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                    {u.display_name ?? <span className="text-[#4B4F6B] italic">unnamed</span>}
                  </td>
                  <td className="px-4 py-3 text-[#8B8FA8] font-mono text-xs whitespace-nowrap">
                    {u.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={
                        u.subscription_tier === 'premium'
                          ? { backgroundColor: '#7B6CF622', color: '#7B6CF6' }
                          : { backgroundColor: '#8B8FA822', color: '#8B8FA8' }
                      }
                    >
                      {u.subscription_tier === 'premium' ? 'Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#F6A26C] font-semibold tabular-nums">
                    🔥 {u.current_streak}
                    {u.longest_streak > u.current_streak && (
                      <span className="text-[#4B4F6B] font-normal ml-1 text-xs">/{u.longest_streak}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8B8FA8] tabular-nums">{u.total_entries}</td>
                  <td className="px-4 py-3">
                    {u.onboarding_done
                      ? <span className="text-[#22C55E] text-xs">✓</span>
                      : <span className="text-[#4B4F6B] text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#8B8FA8] text-xs whitespace-nowrap">
                    {fmtDate(u.last_entry_date)}
                  </td>
                  <td className="px-4 py-3 text-[#4B4F6B] text-xs whitespace-nowrap">
                    {fmtDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="py-16 text-center text-[#8B8FA8] text-sm">
              No users yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
