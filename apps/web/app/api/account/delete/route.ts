import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/account/delete
 *
 * GDPR right-to-erasure: soft-deletes all user content, then hard-deletes
 * the Supabase auth user via the admin API.
 *
 * Flow:
 *  1. Verify the session is still valid (user must be signed in)
 *  2. Delegate to the export-user-data edge function with ?hard=1 for full deletion
 *  3. If edge function unavailable, fall back to direct cascade delete via admin client
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delegate to the export-user-data edge function for proper GDPR erasure
    const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const { data: { session } } = await supabase.auth.getSession()

    const edgeRes = await fetch(
      `${supabaseUrl}/functions/v1/export-user-data?hard=1`,
      {
        method: 'DELETE',
        headers: {
          Authorization:  `Bearer ${session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
          apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
      },
    )

    if (!edgeRes.ok) {
      console.warn('[account/delete] edge function failed, falling back to admin delete:', await edgeRes.text())
      // Fallback: use admin client to delete the auth user directly
      // FK cascade removes all rows in public schema
      const admin = createAdminClient()
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete] error:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
