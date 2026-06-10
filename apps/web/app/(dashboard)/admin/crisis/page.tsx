import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CrisisClient, type CrisisEvent } from './CrisisClient'

export const metadata = { title: 'Crisis Events — Admin — ECHO' }

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

async function fetchCrisisEvents(resolved: boolean): Promise<CrisisEvent[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crisis_events')
    .select(`
      id, user_id, entry_id, severity, trigger_phrase, detected_tags,
      response_sent, resolved, resolved_by, resolved_at, notes, created_at,
      users ( email, display_name, current_streak )
    `)
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[admin/crisis] fetch error:', error)
    return []
  }

  return (data ?? []) as unknown as CrisisEvent[]
}

interface PageProps {
  searchParams: Promise<{ resolved?: string }>
}

export default async function AdminCrisisPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const email = user.email?.toLowerCase() ?? ''
  const isAdmin = ADMIN_EMAILS.includes(email) || email.endsWith('@echo-self.app')
  if (!isAdmin) redirect('/')

  const params = await searchParams
  const showResolved = params.resolved === 'true'

  const events = await fetchCrisisEvents(showResolved)

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-[#8B8FA8] hover:text-white text-sm transition-colors">← App</a>
              <span className="text-[#2A2D3E]">/</span>
              <a href="/admin" className="text-[#8B8FA8] hover:text-white text-sm transition-colors">Admin</a>
              <span className="text-[#2A2D3E]">/</span>
              <h1 className="text-xl font-semibold tracking-tight">Crisis Events</h1>
            </div>
            <p className="text-[11px] text-[#4B4F6B] mt-1">
              Showing {showResolved ? 'resolved' : 'unresolved'} events · {user.email}
            </p>
          </div>

          <a
            href="/admin/users"
            className="text-sm text-[#8B8FA8] hover:text-[#7B6CF6] transition-colors"
          >
            All users →
          </a>
        </header>

        <CrisisClient initialEvents={events} showResolved={showResolved} />
      </div>
    </div>
  )
}
