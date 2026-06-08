/**
 * Admin API — Crisis Events
 *
 * GET  /api/admin/crisis          — list unresolved crisis events
 * POST /api/admin/crisis/:id/resolve — mark a crisis event as resolved
 *
 * Auth: admin emails only (ADMIN_EMAILS env var or @echo-self.app domain)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

async function requireAdmin(): Promise<{ user: { id: string; email: string } } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.email?.toLowerCase() ?? ''
  const isAdmin = ADMIN_EMAILS.includes(email) || email.endsWith('@echo-self.app')

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user: { id: user.id, email } }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createAdminClient()

  const resolved  = req.nextUrl.searchParams.get('resolved') === 'true'
  const severity  = req.nextUrl.searchParams.get('severity')
  const limit     = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200)

  let query = supabase
    .from('crisis_events')
    .select(`
      id, user_id, entry_id, severity, trigger_phrase, detected_tags,
      response_sent, resolved, resolved_by, resolved_at, notes, created_at,
      users ( email, display_name, current_streak )
    `)
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (severity) {
    query = query.eq('severity', severity)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ crisisEvents: data ?? [], total: data?.length ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id param required' }, { status: 400 })
  }

  let body: { resolved?: boolean; notes?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crisis_events')
    .update({
      resolved:     body.resolved ?? true,
      resolved_by:  auth.user.email,
      resolved_at:  new Date().toISOString(),
      notes:        body.notes ?? null,
    })
    .eq('id', id)
    .select('id, resolved, resolved_at, resolved_by')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ crisisEvent: data })
}
