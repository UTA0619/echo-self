/**
 * analytics-events — Server-side analytics event ingestion
 *
 * Receives product analytics events from the mobile app and forwards them
 * to PostHog server-side (bypasses ad blockers, enriches with server data).
 * Also writes growth-critical events to the `analytics_events` table for
 * internal SQL dashboards.
 *
 * POST /analytics-events
 * Body: { event: string, properties?: Record<string, unknown>, timestamp?: string }
 *
 * Server-side enrichment adds:
 *  - user_id (from auth token)
 *  - subscription_tier (from users table)
 *  - current_streak
 *  - total_entries
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const POSTHOG_API_KEY          = Deno.env.get('POSTHOG_API_KEY')!;
const POSTHOG_HOST             = Deno.env.get('POSTHOG_HOST') ?? 'https://app.posthog.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Growth-critical events that get stored in DB for SQL analysis
const PERSIST_EVENTS = new Set([
  'entry_submitted',
  'echo_received',
  'onboarding_completed',
  'persona_revealed',
  'prediction_shared',
  'paywall_viewed',
  'upgrade_tapped',
  'subscription_activated',
  'referral_shared',
  'referral_applied',
  'streak_7_days',
  'streak_30_days',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { event?: string; properties?: Record<string, unknown>; timestamp?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { event, properties = {}, timestamp } = body;
  if (!event) return json({ error: 'event is required' }, 400);

  // ── Server-side enrichment ───────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier, current_streak, total_entries')
    .eq('id', user.id)
    .single();

  const enriched = {
    ...properties,
    $user_id:          user.id,
    subscription_tier: profile?.subscription_tier ?? 'free',
    current_streak:    profile?.current_streak ?? 0,
    total_entries:     profile?.total_entries ?? 0,
    server_timestamp:  new Date().toISOString(),
  };

  // ── Forward to PostHog ──────────────────────────────────────────────────
  const posthogPromise = POSTHOG_API_KEY
    ? fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_API_KEY,
          event,
          distinct_id: user.id,
          properties: enriched,
          timestamp: timestamp ?? new Date().toISOString(),
        }),
      }).catch(err => console.warn('[analytics-events] PostHog error:', err))
    : Promise.resolve();

  // ── Persist growth-critical events to DB ─────────────────────────────────
  const persistPromise = PERSIST_EVENTS.has(event)
    ? supabase.from('analytics_events').insert({
        user_id:    user.id,
        event_name: event,
        properties: enriched,
        occurred_at: timestamp ?? new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn('[analytics-events] DB insert error:', error.message);
      })
    : Promise.resolve();

  await Promise.all([posthogPromise, persistPromise]);

  return json({ ok: true, event });
});

// ──────────────────────────────────────────────────────────────────────────
// Growth analytics queries — called by internal dashboards
// ──────────────────────────────────────────────────────────────────────────
// These SQL views are created in the migration file below.
// SQL dashboard queries:
//
// -- D1/D7/D30 retention
// SELECT
//   DATE(e.occurred_at) AS cohort_date,
//   COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_name = 'entry_submitted') AS d1_active,
//   COUNT(DISTINCT e.user_id) FILTER (
//     WHERE e.event_name = 'entry_submitted'
//       AND e.occurred_at >= cohort_date + 7
//   ) AS d7_retained
// FROM analytics_events e
// GROUP BY 1 ORDER BY 1 DESC;
//
// -- Paywall → Conversion funnel
// SELECT
//   COUNT(*) FILTER (WHERE event_name = 'paywall_viewed')       AS paywall_views,
//   COUNT(*) FILTER (WHERE event_name = 'upgrade_tapped')       AS upgrade_taps,
//   COUNT(*) FILTER (WHERE event_name = 'subscription_activated') AS conversions,
//   ROUND(
//     100.0 * COUNT(*) FILTER (WHERE event_name = 'subscription_activated')
//     / NULLIF(COUNT(*) FILTER (WHERE event_name = 'paywall_viewed'), 0),
//     2
//   ) AS conversion_rate_pct
// FROM analytics_events;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
