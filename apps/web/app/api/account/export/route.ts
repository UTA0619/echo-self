/**
 * POST /api/account/export
 *
 * Generates a full data export for the authenticated user.
 * Returns a JSON file containing entries, identity nodes, behavioral patterns,
 * and profile metadata — everything needed for data portability.
 *
 * Rate-limited implicitly by Supabase row limits (max 500 entries returned).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Parallel fetch of all user data
    const [
      profileRes,
      entriesRes,
      identityRes,
      patternsRes,
      futureSelfRes,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, timezone, notification_time, onboarding_data, created_at')
        .eq('auth_id', user.id)
        .maybeSingle(),

      supabase
        .from('entries')
        .select('id, content, emotion, ai_response, word_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),

      supabase
        .from('identity_nodes')
        .select('type, label, description, polarity, confidence, active, created_at')
        .eq('user_id', user.id)
        .order('confidence', { ascending: false }),

      supabase
        .from('behavioral_patterns')
        .select('pattern_type, pattern_description, frequency_days, confidence, trigger_tags, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true),

      supabase
        .from('future_self_simulations')
        .select('horizon_months, narrative, letter_text, trajectory_score, created_at')
        .eq('user_id', user.id)
        .order('horizon_months', { ascending: true }),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      export_version: '1.0',
      user: {
        email: user.email,
        profile: profileRes.data,
      },
      entries: entriesRes.data ?? [],
      identity: {
        nodes:    identityRes.data ?? [],
        patterns: patternsRes.data ?? [],
      },
      future_self: futureSelfRes.data ?? [],
      _meta: {
        entries_count:  entriesRes.data?.length ?? 0,
        identity_nodes: identityRes.data?.length ?? 0,
        patterns:       patternsRes.data?.length ?? 0,
        note: 'Memory embeddings (vector data) are not included in this export.',
      },
    }

    const json     = JSON.stringify(exportData, null, 2)
    const filename = `echo-export-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[export] error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
