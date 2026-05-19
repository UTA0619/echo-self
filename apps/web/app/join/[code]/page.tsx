import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ code: string }>
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  // Validate referral code exists
  const { data: referral } = await supabase
    .from('referrals')
    .select('user_id, referral_code')
    .eq('referral_code', code)
    .maybeSingle()

  // Store referral code in cookie and redirect to auth
  // The cookie is picked up during onboarding to credit both users
  const response = redirect(`/auth?ref=${code}`)
  return response
}
