import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: referral } = await supabase
    .from('referrals')
    .select('referral_code, total_referrals, successful_referrals, reward_months_earned')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!referral) {
    const code = user.id.slice(0, 8).toUpperCase()
    const { data: created } = await supabase.from('referrals').insert({ user_id: user.id, referral_code: code }).select().single()
    return NextResponse.json({ referral: created })
  }

  return NextResponse.json({ referral })
}
