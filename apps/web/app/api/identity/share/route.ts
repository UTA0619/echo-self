/**
 * POST /api/identity/share
 *
 * Creates a public identity share from the user's top identity nodes.
 * Each call creates a new immutable snapshot share.
 * Returns a shareable URL at /identity/[shareId].
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch top identity nodes + profile in parallel
  const [nodesRes, profileRes] = await Promise.all([
    supabase
      .from('identity_nodes')
      .select('type, label, confidence, polarity')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('confidence', { ascending: false })
      .limit(7),
    supabase
      .from('profiles')
      .select('display_name')
      .eq('auth_id', user.id)
      .maybeSingle(),
  ])

  const nodes = nodesRes.data ?? []
  if (nodes.length === 0) {
    return NextResponse.json(
      { error: 'No identity nodes yet — write a few more journal entries first.' },
      { status: 422 },
    )
  }

  const topNodes = nodes.slice(0, 5)

  // Generate one-line share_text from top positive labels
  const topLabels = topNodes
    .filter(n => n.polarity !== 'negative')
    .slice(0, 3)
    .map(n => n.label)
  const shareText = topLabels.length > 0
    ? `${topLabels.slice(0, -1).join(', ')}${topLabels.length > 1 ? ' and ' : ''}${topLabels.at(-1)}.`
    : null

  const { data: share, error } = await supabase
    .from('identity_shares')
    .insert({
      user_id:      user.id,
      display_name: profileRes.data?.display_name ?? null,
      top_nodes:    topNodes,
      share_text:   shareText,
      is_public:    true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[identity/share] insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://echo-self.app'
  return NextResponse.json({ url: `${baseUrl}/identity/${share.id}`, shareId: share.id })
}
