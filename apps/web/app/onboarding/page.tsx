import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Already onboarded — go to dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done, display_name')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (profile?.onboarding_done) redirect('/')

  return (
    <main className="min-h-screen bg-[#0A0B0F] flex items-center justify-center px-4">
      <OnboardingClient
        userId={user.id}
        email={user.email ?? ''}
        defaultName={profile?.display_name ?? ''}
      />
    </main>
  )
}
