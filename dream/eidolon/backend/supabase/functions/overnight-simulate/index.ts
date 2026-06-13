import { generateWithFallback } from '../_shared/ai_client.ts';
import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  verifyJwt,
} from '../_shared/auth.ts';
import {
  buildOvernightFallback,
  buildOvernightSystemPrompt,
  type OvernightOutcome,
  sanitizeOutcome,
} from '../_shared/overnight_prompt.ts';
import { clampGuardrails, selectThemeWithinGuardrails } from '../_shared/guardrails.ts';
import { consentSet, filterRealityByConsent } from '../_shared/consent.ts';
import { screenNarrative, assertMemoryProvenance } from '../_shared/narrative_honesty.ts';
import type { DungeonTheme } from '../_shared/types.ts';

const THEME_FLAVORS: Record<DungeonTheme, string> = {
  forest: 'An ancient forest filled with glowing fungi and forgotten shrines.',
  cave: 'A network of caverns humming with crystal resonance.',
  ruins: 'The crumbling remains of a civilization lost to time.',
  void: 'A dimension between dimensions — logic bends here.',
  ocean_depth: 'The sunken corridors of a drowned palace.',
  sky_citadel: 'Floating platforms connected by chains above the clouds.',
  shadow_realm: 'A mirror world where light acts as poison.',
  crystal_maze: 'Shifting walls of pure prism that reflect the soul.',
};
const THEMES = Object.keys(THEME_FLAVORS) as DungeonTheme[];

// Minimal shape of the eidolon row we operate on.
interface EidolonRow {
  id: string;
  user_id: string;
  name: string;
  level: number;
  xp: number;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  auto_strategy: string;
  risk_tolerance: number;
  social_openness: number;
  // joined
  users?: { language?: string | null } | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  const db = createServiceClient();
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');

  // ── Mode 1: nightly cron batch ─────────────────────────────────────────────
  if (providedSecret) {
    if (!cronSecret || providedSecret !== cronSecret) {
      return errorResponse('UNAUTHORIZED', 'Invalid cron secret', 401);
    }

    // Eidolons with no run for today yet (cap the batch to stay within limits).
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await db
      .from('overnight_runs')
      .select('eidolon_id')
      .eq('run_date', today);
    const done = new Set((existing ?? []).map((r) => r.eidolon_id));

    const { data: eidolons } = await db
      .from('eidolons')
      .select(eidolonSelect)
      .limit(500);

    const pending = (eidolons ?? []).filter((e) => !done.has(e.id));
    let ok = 0;
    for (const e of pending as EidolonRow[]) {
      try {
        await simulateOne(db, e, today);
        ok++;
      } catch (err) {
        console.error(`[overnight] failed for eidolon ${e.id}:`, err);
      }
    }
    return jsonResponse({ mode: 'cron', processed: ok, skipped: done.size });
  }

  // ── Mode 2: on-demand for the signed-in user (immediate gratification) ──────
  const caller = await verifyJwt(req);
  if (!caller) return errorResponse('UNAUTHORIZED', 'Invalid token', 401);

  const today = new Date().toISOString().slice(0, 10);
  const { data: eidolon } = await db
    .from('eidolons')
    .select(eidolonSelect)
    .eq('user_id', caller.userId)
    .single();

  if (!eidolon) return errorResponse('NOT_FOUND', 'Eidolon not found', 404);

  // Idempotent: if tonight's run already exists, return it untouched.
  const { data: already } = await db
    .from('overnight_runs')
    .select('id')
    .eq('eidolon_id', eidolon.id)
    .eq('run_date', today)
    .maybeSingle();
  if (already) {
    return jsonResponse({ mode: 'user', runId: already.id, alreadyExisted: true });
  }

  const runId = await simulateOne(db, eidolon as EidolonRow, today);
  return jsonResponse({ mode: 'user', runId, alreadyExisted: false });
});

const eidolonSelect =
  'id, user_id, name, level, xp, openness, conscientiousness, extraversion, agreeableness, neuroticism, auto_strategy, risk_tolerance, social_openness, users!inner(language)';

// Generate, persist, and apply one Eidolon's overnight run. Returns the run id.
async function simulateOne(
  db: ReturnType<typeof createServiceClient>,
  e: EidolonRow,
  runDate: string,
): Promise<string> {
  const language = e.users?.language === 'ja' ? 'ja' : 'en';

  // Bounded autonomy (D6): the realm is chosen WITHIN the player's guardrails
  // (migration 014), not by blind Math.random(). clampGuardrails defends against
  // out-of-range values; the Dart UI to let players tune these is the owed client half.
  const guardrails = clampGuardrails({
    openness: e.openness,
    autoStrategy: e.auto_strategy,
    riskTolerance: e.risk_tolerance,
    socialOpenness: e.social_openness,
  });
  const theme = selectThemeWithinGuardrails(THEMES, guardrails) as DungeonTheme;

  // Reality data is folded in ONLY for signals the player consented to (D4), and
  // non-consented fields are dropped entirely, never zeroed (D8 minimization).
  const { data: grantRows } = await db
    .from('consent_grants')
    .select('signal, granted')
    .eq('user_id', e.user_id);
  const { data: rawSync } = await db
    .from('reality_syncs')
    .select('steps, sleep_hours')
    .eq('user_id', e.user_id)
    .eq('sync_date', runDate)
    .maybeSingle();
  const sync = filterRealityByConsent(rawSync, consentSet(grantRows));
  const energyNote = describeEnergy(sync.steps, sync.sleep_hours);

  // Top recent memories for continuity.
  const { data: mems } = await db
    .from('memories')
    .select('content')
    .eq('eidolon_id', e.id)
    .order('created_at', { ascending: false })
    .limit(5);
  const topMemories = (mems ?? []).map((m) => `- ${m.content}`).join('\n');

  const system = buildOvernightSystemPrompt({
    name: e.name,
    level: e.level,
    openness: e.openness,
    conscientiousness: e.conscientiousness,
    extraversion: e.extraversion,
    agreeableness: e.agreeableness,
    neuroticism: e.neuroticism,
    autoStrategy: e.auto_strategy,
    theme,
    themeFlavor: THEME_FLAVORS[theme],
    energyNote,
    topMemories,
    language,
  });

  let outcome: OvernightOutcome;
  let modelUsed = 'local';
  try {
    const res = await generateWithFallback({
      system,
      user: `Narrate ${e.name}'s overnight venture into the ${theme}.`,
      model: 'claude-sonnet-4-5', // quality matters most here
      maxTokens: 1024,
    });
    modelUsed = res.modelUsed;
    outcome = sanitizeOutcome(safeParse(res.text), e.name, theme, language);
  } catch (err) {
    console.warn('[overnight] generation failed, using fallback:', err);
    outcome = buildOvernightFallback(e.name, theme, language);
  }

  // Narrative honesty (D5): a report that solicits a purchase or manufactures
  // urgency is inadmissible. The deterministic screen catches it; on failure we
  // serve the safe offline narrative rather than ship a manipulative one.
  const screen = screenNarrative(outcome);
  if (!screen.ok) {
    console.warn(
      `[overnight] D5 honesty screen rejected report for eidolon ${e.id}:`,
      screen.violations.map((v) => v.code).join(','),
    );
    outcome = buildOvernightFallback(e.name, theme, language);
    modelUsed = 'local';
  }

  // Persist the run (one per eidolon per night).
  const { data: run, error: insErr } = await db
    .from('overnight_runs')
    .insert({
      eidolon_id: e.id,
      user_id: e.user_id,
      run_date: runDate,
      status: 'completed',
      theme,
      narrative: outcome.narrative,
      mood: outcome.mood,
      highlight: outcome.highlight,
      xp_gained: outcome.xpGained,
      loot: outcome.loot,
      ai_model: modelUsed,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  // Apply rewards: XP + mood on the eidolon, and a memory for continuity.
  await db
    .from('eidolons')
    .update({ xp: e.xp + outcome.xpGained, current_mood: outcome.mood })
    .eq('id', e.id);

  const memory = {
    eidolon_id: e.id,
    memory_type: 'episodic',
    content: outcome.highlight,
    importance: 0.6,
    emotion_tag: outcome.mood,
    source: 'overnight_run',
    source_ref: run.id as string,
  };
  // D5 provenance: every overnight memory must point back to the run that produced
  // it, so a Morning Report can always be traced to a real event (not a fabrication).
  const prov = assertMemoryProvenance(memory, run.id as string);
  if (!prov.ok) {
    console.error(
      `[overnight] D5 provenance violation for eidolon ${e.id}:`,
      prov.violations.map((v) => v.code).join(','),
    );
  }
  await db.from('memories').insert(memory);

  return run.id as string;
}

function describeEnergy(steps?: number | null, sleepHours?: number | null): string {
  if (steps == null && sleepHours == null) return '(no data)';
  const parts: string[] = [];
  if (sleepHours != null) {
    parts.push(sleepHours >= 7 ? 'well-rested' : sleepHours >= 5 ? 'a little tired' : 'sleep-deprived');
  }
  if (steps != null) {
    parts.push(steps >= 8000 ? 'very active' : steps >= 3000 ? 'moderately active' : 'mostly at rest');
  }
  return parts.join(' and ');
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Models sometimes wrap JSON in prose/markdown fences — extract the object.
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
