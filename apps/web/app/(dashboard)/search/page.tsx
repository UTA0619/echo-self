import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchClient } from './SearchClient'

export const metadata = { title: 'Search — ECHO' }

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <main className="min-h-screen bg-[#0A0B0F] max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center gap-3 mb-8">
        <a href="/" className="text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors text-sm">
          ← Back
        </a>
        <h1 className="text-lg font-semibold text-[#F0F0F5]">Memory Search</h1>
      </header>

      <SearchClient />
    </main>
  )
}
