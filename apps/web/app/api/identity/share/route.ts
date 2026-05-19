import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: nodes } = await supabase
    .from('identity_nodes')
    .select('id, type, label, confidence, polarity')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('confidence', { ascending: false })
    .limit(8)

  const shareCode = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://echo-self.app'

  const { error } = await supabase
    .from('identity_shares')
    .upsert({ user_id: user.id, share_code: shareCode, nodes_snapshot: nodes ?? [], updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: `${appUrl}/identity/${shareCode}` })
}
