/**
 * Public Identity Share Page — /identity/[shareId]
 *
 * Renders a user's shared identity card publicly (no auth required).
 * Identity shares are opt-in — generated when a user explicitly shares
 * from the IdentityShareCard component.
 *
 * OG meta tags are set for rich social previews.
 */
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ shareId: string }>
}

interface IdentityShare {
  id: string
  display_name: string | null
  top_nodes: Array<{
    type: string
    label: string
    confidence: number
    polarity: 'positive' | 'negative' | 'neutral'
  }>
  share_text: string | null
  created_at: string
}

async function fetchShare(shareId: string): Promise<IdentityShare | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('identity_shares')
    .select('id, display_name, top_nodes, share_text, created_at')
    .eq('id', shareId)
    .eq('is_public', true)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params
  const share = await fetchShare(shareId)
  if (!share) return { title: 'Identity — ECHO' }

  const name = share.display_name ?? 'Someone'
  return {
    title:       `${name}'s Identity — ECHO`,
    description: share.share_text ?? `See ${name}'s identity layer — built from their real memory patterns.`,
    openGraph: {
      title:       `${name}'s Identity`,
      description: share.share_text ?? `Built by ECHO — AI-native memory layer`,
      siteName:    'ECHO',
      type:        'website',
    },
    twitter: {
      card:  'summary',
      title: `${name}'s Identity — ECHO`,
    },
  }
}

// ── Node type display ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  belief:               'Belief',
  value:                'Value',
  core_fear:            'Core Fear',
  core_desire:          'Core Desire',
  behavioral_pattern:   'Pattern',
  relationship_pattern: 'Relationship',
  strength:             'Strength',
}

const POLARITY_COLORS: Record<string, string> = {
  positive: '#7B6CF6',
  negative: '#F66C7B',
  neutral:  '#8B8FA8',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function IdentitySharePage({ params }: Props) {
  const { shareId } = await params
  const share = await fetchShare(shareId)

  if (!share) notFound()

  const name     = share.display_name ?? 'Someone'
  const dateStr  = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-[#F0F0F5]">
      {/* Nav */}
      <nav className="border-b border-[#1E2030]/60 px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
        <Link href="/" className="text-sm font-semibold tracking-tight">ECHO</Link>
        <Link
          href="/auth"
          className="text-xs text-[#7B6CF6] hover:text-[#A89EFF] transition-colors"
        >
          Build yours →
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <p className="text-[10px] tracking-widest text-[#7B6CF6] uppercase font-medium">
            Identity Layer
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          {share.share_text && (
            <p className="text-[#8B8FA8] text-sm italic max-w-md mx-auto leading-relaxed">
              "{share.share_text}"
            </p>
          )}
          <p className="text-[#454860] text-xs">Shared {dateStr}</p>
        </header>

        {/* Identity nodes */}
        {share.top_nodes && share.top_nodes.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">
              Identity Signals
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {share.top_nodes.map((node, i) => (
                <article
                  key={i}
                  className="border border-[#1E2030] bg-[#141620] rounded-xl p-4 flex items-start gap-3"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: POLARITY_COLORS[node.polarity] ?? '#8B8FA8' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-semibold text-[#454860] uppercase tracking-wider">
                        {TYPE_LABELS[node.type] ?? node.type}
                      </span>
                      <span className="text-[10px] text-[#2E3048] font-mono">
                        {Math.round(node.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-[#C4C8E8] leading-snug">{node.label}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-center text-[#454860] text-sm py-8">
            No identity signals shared.
          </p>
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-[#141620] border border-[#7B6CF6]/20 p-8 text-center space-y-4">
          <p className="text-sm text-[#8B8FA8]">
            ECHO builds your identity layer from your journal entries — automatically.
          </p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 rounded-xl bg-[#7B6CF6] text-white font-semibold text-sm hover:bg-[#7B6CF6]/90 transition-colors"
          >
            Start building yours →
          </Link>
          <p className="text-[10px] text-[#454860]">Free to start · No credit card</p>
        </div>
      </main>
    </div>
  )
}
