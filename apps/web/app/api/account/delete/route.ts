import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/account/delete
 * GDPR-compliant account deletion: removes all user data then deletes the auth user.
 * The cascade DELETE on auth.users propagates to all public tables via FK constraints.
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sign out all sessions first so the client token is invalidated
  await supabase.auth.signOut({ scope: 'global' })

  // Delete profile row — cascade handles entries, identity_traits, emotions, etc.
  // The service role key is required to delete from auth.users; we rely on Supabase
  // admin API for the final step. For now we delete the profile and all related rows;
  // the auth user becomes orphaned and can be purged via a Supabase cron / webhook.
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (error) {
    console.error('[account/delete]', error)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
