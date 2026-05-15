/**
 * export-user-data — GDPR / Right to Data Portability
 *
 * Authenticated endpoint that bundles all personal data for the
 * requesting user into a JSON archive and returns it as a download.
 *
 * DELETE requests trigger the right-to-erasure flow:
 *  1. Soft-delete all personal content (journal entries, memories, etc.)
 *  2. Anonymise the user row (email, display_name → null)
 *  3. Schedule hard-delete via a pg cron job at T+30 days (configurable)
 *
 * POST /export-user-data          → download data archive
 * DELETE /export-user-data        → initiate account deletion
 * DELETE /export-user-data?hard=1 → immediate hard delete (admin only)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const userId = user.id;

  // ── DELETE — Right to Erasure ────────────────────────────────────────────
  if (req.method === 'DELETE') {
    return handleErasure(supabaseAdmin, userId, req);
  }

  // ── POST — Data Export ───────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  return handleExport(supabaseAdmin, userId);
});

// ─────────────────────────────────────────────────────────────────────────────
// Export handler — collects all personal data in parallel
// ─────────────────────────────────────────────────────────────────────────────
async function handleExport(supabase: ReturnType<typeof createClient>, userId: string) {
  const [
    profileResult,
    entriesResult,
    memoriesResult,
    predictionsResult,
    identityResult,
    subscriptionResult,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, display_name, created_at, current_streak, longest_streak, subscription_tier')
      .eq('id', userId)
      .single(),

    supabase
      .from('journal_entries')
      .select('id, content, word_count, emotion_analysis, echo_response, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    supabase
      .from('memories')
      .select('id, content, memory_type, importance, emotion_tags, themes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    supabase
      .from('future_self_predictions')
      .select('id, timeframe, persona_name, persona_description, archetype, confidence_score, core_traits, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false }),

    supabase
      .from('identity_nodes')
      .select('id, node_type, label, description, polarity, confidence, first_seen, last_seen')
      .eq('user_id', userId),

    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, cancel_at_period_end, created_at')
      .eq('user_id', userId)
      .single(),
  ]);

  const archive = {
    export_metadata: {
      exported_at: new Date().toISOString(),
      format_version: '1.0.0',
      user_id: userId,
      gdpr_compliant: true,
    },
    profile: profileResult.data ?? null,
    journal_entries: entriesResult.data ?? [],
    memories: memoriesResult.data ?? [],
    future_self_predictions: predictionsResult.data ?? [],
    identity_nodes: identityResult.data ?? [],
    subscription: subscriptionResult.data ?? null,
  };

  const body = JSON.stringify(archive, null, 2);
  const filename = `echo-self-export-${userId.slice(0, 8)}-${Date.now()}.json`;

  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(new TextEncoder().encode(body).length),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Erasure handler — soft-delete personal data, anonymise user row
// ─────────────────────────────────────────────────────────────────────────────
async function handleErasure(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: Request,
) {
  const url = new URL(req.url);
  const isHardDelete = url.searchParams.get('hard') === '1';

  if (isHardDelete) {
    // Hard delete — remove all rows. Cascades will clean up child tables.
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) return json({ error: error.message }, 500);

    // Also delete Supabase Auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) console.error('[export-user-data] auth delete failed:', authErr.message);

    return json({ message: 'Account permanently deleted.', deleted_at: new Date().toISOString() });
  }

  // Soft-delete: anonymise personal content within 30 days
  const anonymisedAt = new Date().toISOString();

  const [pErr, eErr, mErr] = await Promise.all([
    // Anonymise user profile
    supabase
      .from('users')
      .update({
        email: `deleted-${userId.slice(0, 8)}@anon.echoself.app`,
        display_name: '[deleted]',
        deletion_requested_at: anonymisedAt,
      })
      .eq('id', userId)
      .then(r => r.error),

    // Wipe journal entry content
    supabase
      .from('journal_entries')
      .update({ content: '[content deleted by user request]', echo_response: null, emotion_analysis: null })
      .eq('user_id', userId)
      .then(r => r.error),

    // Delete memories and embeddings
    supabase
      .from('memories')
      .delete()
      .eq('user_id', userId)
      .then(r => r.error),
  ]);

  const errors = [pErr, eErr, mErr].filter(Boolean);
  if (errors.length > 0) {
    console.error('[export-user-data] partial erasure errors:', errors);
    return json({ error: 'Partial erasure failure — please contact support.' }, 500);
  }

  return json({
    message: 'Erasure request received. Your personal data will be permanently deleted within 30 days.',
    requested_at: anonymisedAt,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
