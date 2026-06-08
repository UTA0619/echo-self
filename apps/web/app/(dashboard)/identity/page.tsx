/**
 * Identity Explorer — /identity
 *
 * Full-page view of the user's identity web:
 *  - All active identity nodes grouped by type
 *  - Confidence distribution chart
 *  - Evidence count per node
 *  - Share button → generates public identity card
 */
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { fetchIdentityNodes, fetchBehavioralPatterns } from '@/lib/identity'
import { IdentityExplorerClient } from './IdentityExplorerClient'

export const metadata: Metadata = {
  title: 'Identity Web — ECHO',
  description: 'Explore the patterns, beliefs, and values ECHO has inferred from your journal entries.',
}

export default async function IdentityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [nodes, patterns] = await Promise.all([
    fetchIdentityNodes().catch(() => []),
    fetchBehavioralPatterns().catch(() => []),
  ])

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <a href="/" className="text-[#8B8FA8] hover:text-white transition-colors text-sm">
            ← Dashboard
          </a>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Your Identity Web</h1>
        <p className="text-[#8B8FA8] text-sm mt-1">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''} inferred from your journal entries
        </p>
      </header>

      <IdentityExplorerClient nodes={nodes} patterns={patterns} />
    </main>
  )
}
