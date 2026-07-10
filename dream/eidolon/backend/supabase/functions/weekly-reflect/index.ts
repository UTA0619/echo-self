import { generateWithFallback } from '../_shared/ai_client.ts';
import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  verifyJwt,
} from '../_shared/auth.ts';
import {
  buildReflectionFallback,
  buildReflectionSystemPrompt,
  type ReflectionOutcome,
  sanitizeReflection,
  shouldGenerateReflection,
} from '../_shared/reflection_prompt.ts';
import { consentSet, filterRealityByConsent } from '../_shared/consent.ts';
import { cognitionModelForTier, tierFromValue } from '../_shared/cognition.ts';

// Minimal shape of the eidolon row we operate on.
interface EidolonRow {
  id: string;
  user_id: string;
  name: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  users?: {
    language?: string | null;
    subscriptions?: { tier?: string | null }[] | null;
  } | null;
}

const eidolonSelect =
  'id, user_id, name, openness, conscientiousness, extraversion, agreeableness, neuroticism, users!inner(language, subscriptions(tier))';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  const db = createServiceClient();
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  const weekStart = weekStartMonday(new Date());

  // ── Mode 1: weekly cron batch ──────────────────────────────────────────────
  if (providedSecret) {
    if (!cronSecret || providedSecret !== cronSecret) {
      return errorResponse('UNAUTHORIZED', 'Invalid cron secret', 401);
    }

    const { data: existing } = await db
      .from('weekly_reflections')
      .select('eidolon_id')
      .eq('week_start', weekStart);
    const done = new Set((existing ?? []).map((r) => r.eidolon_id));

    const { data: eidolons } = await db
      .from('eidolons')
      .select(eidolonSelect)
      .limit(500);

    let ok = 0;
    let skippedFree = 0;
    for (const e of (eidolons ?? []) as EidolonRow[]) {
      if (done.has(e.id)) continue;
      // Paid-tier perk only (STRATEGY §6). Free users are skipped, not failed.
      if (!shouldGenerateReflection(tierFromValue(e.users?.subscriptions?.[0]?.tier))) {
        skippedFree++;
        continue;
      }
      try {
        await reflectOne(db, e, weekStart);
        ok++;
      } catch (err) {
        console.error(`[weekly-reflect] failed for eidolon ${e.id}:`, err);
      }
    }
    return jsonResponse({ mode: 'cron', processed: ok, skippedFree });
  }

  // ── Mode 2: on-demand for the signed-in user ───────────────────────────────
  const caller = await verifyJwt(req);
  if (!caller) return errorResponse('UNAUTHORIZED', 'Invalid token', 401);

  const { data: eidolon } = await db
    .from('eidolons')
    .select(eidolonSelect)
    .eq('user_id', caller.userId)
    .single();
  if (!eidolon) return errorResponse('NOT_FOUND', 'Eidolon not found', 404);

  const e = eidolon as EidolonRow;
  if (!shouldGenerateReflection(tierFromValue(e.users?.subscriptions?.[0]?.tier))) {
    // D2/transparency: don't pretend; tell the client this is a paid perk.
    return jsonResponse({ mode: 'user', eligible: false });
  }

  // Idempotent: one reflection per Eidolon per week.
  const { data: already } = await db
    .from('weekly_reflections')
    .select('id')
    .eq('eidolon_id', e.id)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (already) {
    return jsonResponse({ mode: 'user', eligible: true, reflectionId: already.id, alreadyExisted: true });
  }

  const reflectionId = await reflectOne(db, e, weekStart);
  return jsonResponse({ mode: 'user', eligible: true, reflectionId, alreadyExisted: false });
});

// Gather a week of grounded signals, generate the reflection, persist it.
async function reflectOne(
  db: ReturnType<typeof createServiceClient>,
  e: EidolonRow,
  weekStart: string,
): Promise<string> {
  const language = e.users?.language === 'ja' ? 'ja' : 'en';
  const cognitionModel = cognitionModelForTier(
    tierFromValue(e.users?.subscriptions?.[0]?.tier),
  );
  const since = sevenDaysAgoIso();

  // Episodic memories from the week (the conversation/event you-graph).
  const { data: mems } = await db
    .from('memories')
    .select('content')
    .eq('eidolon_id', e.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(15);
  const recentMemories = (mems ?? []).map((m) => `- ${m.content}`).join('\n');

  // Overnight highlights from the week.
  const { data: runs } = await db
    .from('overnight_runs')
    .select('highlight')
    .eq('eidolon_id', e.id)
    .gte('run_date', weekStart)
    .order('run_date', { ascending: false })
    .limit(7);
  const recentHighlights = (runs ?? [])
    .map((r) => `- ${r.highlight}`)
    .filter((s) => s.trim() !== '-')
    .join('\n');

  // Reality, consent-filtered (D4/D8): only signals the player opted into, summarized.
  const { data: grantRows } = await db
    .from('consent_grants')
    .select('signal, granted')
    .eq('user_id', e.user_id);
  const grants = consentSet(grantRows);
  const { data: rawSyncs } = await db
    .from('reality_syncs')
    .select('steps, sleep_hours')
    .eq('user_id', e.user_id)
    .gte('sync_date', weekStart);
  const realitySummary = summarizeReality(
    (rawSyncs ?? []).map((s) => filterRealityByConsent(s, grants)),
  );

  const system = buildReflectionSystemPrompt({
    name: e.name,
    openness: e.openness,
    conscientiousness: e.conscientiousness,
    extraversion: e.extraversion,
    agreeableness: e.agreeableness,
    neuroticism: e.neuroticism,
    recentMemories,
    realitySummary,
    recentHighlights,
    language,
  });

  let outcome: ReflectionOutcome;
  let modelUsed = 'local';
  try {
    const res = await generateWithFallback({
      system,
      user: `Reflect on ${e.name}'s past week for them.`,
      model: cognitionModel,
      maxTokens: 600,
    });
    modelUsed = res.modelUsed;
    outcome = sanitizeReflection(safeParse(res.text), e.name, language);
  } catch (err) {
    console.warn('[weekly-reflect] generation failed, using fallback:', err);
    outcome = buildReflectionFallback(e.name, language);
  }

  const { data: row, error: insErr } = await db
    .from('weekly_reflections')
    .insert({
      eidolon_id: e.id,
      user_id: e.user_id,
      week_start: weekStart,
      reflection: outcome.reflection,
      observation: outcome.observation,
      nudge: outcome.nudge,
      ai_model: modelUsed,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return row.id as string;
}

// Monday (UTC) of the week containing `d`, as YYYY-MM-DD.
function weekStartMonday(d: Date): string {
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff),
  );
  return monday.toISOString().slice(0, 10);
}

function sevenDaysAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

// A short, honest summary of the week's consented reality signals. Empty when the
// player shared nothing (D8: absence is never fabricated into zeros).
function summarizeReality(
  syncs: { steps?: number | null; sleep_hours?: number | null }[],
): string {
  const steps = syncs.map((s) => s.steps).filter((v): v is number => v != null);
  const sleeps = syncs.map((s) => s.sleep_hours).filter((v): v is number => v != null);
  const parts: string[] = [];
  if (sleeps.length > 0) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    parts.push(`slept about ${avg.toFixed(1)}h/night across ${sleeps.length} night(s)`);
  }
  if (steps.length > 0) {
    const avg = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
    parts.push(`averaged ~${avg} steps/day`);
  }
  return parts.join('; ');
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
