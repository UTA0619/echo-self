import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchEntries } from '@/lib/entries'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const entries = await fetchEntries(20).catch(() => [])

  return (
    <main className="min-h-screen max-w-xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-geist)' }}
        >
          ECHO
        </h1>
        <span className="text-xs text-[#8B8FA8]">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </header>

      <DashboardClient initialEntries={entries} />
    </main>
  )
}
