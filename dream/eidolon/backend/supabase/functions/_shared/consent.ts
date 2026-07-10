// Consent gate (Doctrine D4: Granular, Revocable Consent; Doctrine D8: Minimization).
//
// Every reality signal (steps, sleep, HRV, emotion) and every social capability is
// opt-in per item and revocable. This module is the SERVER-SIDE enforcement: the
// Edge Function loads the player's consent grants and uses these pure helpers to
// decide what data it may read and what autonomous social actions are allowed.
//
// Default DENY: a signal with no explicit grant is treated as not consented, so a
// missing row can never leak data (D8). The Dart UI that lets a player toggle and
// revoke grants is the client half (owed; tracked as OBL_CONSENT_LEDGER UI).
//
// Pure and dependency-free (unit-testable without Deno/DB).
//
// See: docs/governance/CONSTITUTION.md (D4, D8), docs/governance/phases/PHASE_A.md (A-1),
//      backend/supabase/migrations/013_consent_ledger.sql

/** The full set of independently-consentable capabilities. */
export const CONSENT_SIGNALS = [
  'steps',
  'sleep',
  'hrv',
  'emotion',
  'social_visit',
  'social_trade',
  'social_duel',
  'memory_exchange',
] as const;
export type ConsentSignal = (typeof CONSENT_SIGNALS)[number];

export function isConsentSignal(x: string): x is ConsentSignal {
  return (CONSENT_SIGNALS as readonly string[]).includes(x);
}

/** A consent grant row as stored in `consent_grants`. */
export interface ConsentGrant {
  signal: string;
  granted: boolean;
}

/**
 * Build a fast lookup from grant rows. Only rows with `granted === true` count;
 * everything else (absent, revoked, malformed) is DENIED by omission.
 */
export function consentSet(grants: ConsentGrant[] | null | undefined): Set<ConsentSignal> {
  const s = new Set<ConsentSignal>();
  for (const g of grants ?? []) {
    if (g.granted && isConsentSignal(g.signal)) s.add(g.signal);
  }
  return s;
}

export function hasConsent(grants: Set<ConsentSignal>, signal: ConsentSignal): boolean {
  return grants.has(signal);
}

// ── Reality-sync gating (D4 + D8) ────────────────────────────────────────────

export interface RealitySync {
  steps?: number | null;
  sleep_hours?: number | null;
  hrv?: number | null;
}

/**
 * Return only the reality signals the player has consented to. Non-consented
 * fields are dropped entirely (not zeroed) so downstream code cannot accidentally
 * treat "0 steps" as real data. This is the D8 minimization point: the Edge
 * Function should pass the result of this — never the raw sync row — onward.
 */
export function filterRealityByConsent(
  sync: RealitySync | null | undefined,
  grants: Set<ConsentSignal>,
): RealitySync {
  if (!sync) return {};
  const out: RealitySync = {};
  if (sync.steps != null && grants.has('steps')) out.steps = sync.steps;
  if (sync.sleep_hours != null && grants.has('sleep')) out.sleep_hours = sync.sleep_hours;
  if (sync.hrv != null && grants.has('hrv')) out.hrv = sync.hrv;
  return out;
}

/** Map an autonomous social action type to the consent signal it requires. */
export function socialSignalFor(actionType: string): ConsentSignal | null {
  switch (actionType) {
    case 'visit':
      return 'social_visit';
    case 'trade':
      return 'social_trade';
    case 'duel':
      return 'social_duel';
    case 'memory_exchange':
      return 'memory_exchange';
    default:
      return null;
  }
}
