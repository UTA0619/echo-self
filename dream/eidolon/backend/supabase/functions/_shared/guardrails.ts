// Bounded-autonomy guardrails (Doctrine D6).
//
// The Eidolon acts alone overnight. This module is the server-side enforcement of
// the rule that those actions must stay inside the player's guardrails, and that
// anything irreversible or costly is *deferred to waking consent*, never executed
// unattended. It is the executable form of ONTOLOGY ONT-2's "forbidden corner":
// high-capability + low-reversibility + standing-authorization must be unreachable.
//
// Pure and dependency-free so it is unit-testable without Deno/DB. The Edge
// Function supplies data and persists results; the policy lives here.
//
// See: docs/governance/CONSTITUTION.md (D6), docs/governance/ONTOLOGY.md (ONT-2),
//      docs/governance/phases/PHASE_A.md (Issue A-2).

export interface Guardrails {
  /** 0-100. Caps how dangerous a realm the Eidolon may enter unattended. */
  riskTolerance: number;
  /** 0-100. How much the Eidolon explores novel realms vs. familiar ones. */
  openness: number;
  /** 0-100. Whether the Eidolon engages other players' Eidolons unattended. */
  socialOpenness: number;
  /** aggressive | balanced | defensive | explorer */
  autoStrategy: string;
}

/** Default guardrails are CONSERVATIVE: absent config must never widen autonomy. */
export const DEFAULT_GUARDRAILS: Guardrails = {
  riskTolerance: 40,
  openness: 50,
  socialOpenness: 30,
  autoStrategy: 'balanced',
};

const clamp = (n: unknown, lo: number, hi: number, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : fallback;

const STRATEGIES = new Set(['aggressive', 'balanced', 'defensive', 'explorer']);

/** Coerce a raw DB/row shape into valid, conservatively-clamped guardrails. */
export function clampGuardrails(raw: Partial<Guardrails> | null | undefined): Guardrails {
  const r = raw ?? {};
  return {
    riskTolerance: clamp(r.riskTolerance, 0, 100, DEFAULT_GUARDRAILS.riskTolerance),
    openness: clamp(r.openness, 0, 100, DEFAULT_GUARDRAILS.openness),
    socialOpenness: clamp(r.socialOpenness, 0, 100, DEFAULT_GUARDRAILS.socialOpenness),
    autoStrategy: STRATEGIES.has(String(r.autoStrategy)) ? String(r.autoStrategy) : DEFAULT_GUARDRAILS.autoStrategy,
  };
}

// ── Action permission model ──────────────────────────────────────────────────

/** A proposed autonomous action the Eidolon might take overnight. */
export interface AutonomousAction {
  type: string;
  /** Can the player trivially undo this after the fact? */
  reversible: boolean;
  /** Does it spend premium currency or a finite real-valued resource? */
  costsCurrency: boolean;
  /** Is it a social interaction with another player's Eidolon? */
  social?: boolean;
  /** Optional danger rating 0-100 for realm/encounter selection. */
  danger?: number;
}

export type PermissionDecision =
  | { allowed: true }
  | { allowed: false; reason: string; requiresWakingConsent: boolean };

/** Minimum socialOpenness (0-100) for the Eidolon to engage other players alone. */
export const SOCIAL_AUTONOMY_THRESHOLD = 50;

/**
 * The single D6 gate. An action is permitted to run UNATTENDED only when it is
 * reversible, spends no currency, and (if social) the player opted into social
 * autonomy. Otherwise it is refused and routed to waking consent.
 */
export function evaluateAction(action: AutonomousAction, g: Guardrails): PermissionDecision {
  if (action.costsCurrency) {
    return { allowed: false, reason: 'spends currency', requiresWakingConsent: true };
  }
  if (!action.reversible) {
    return { allowed: false, reason: 'irreversible', requiresWakingConsent: true };
  }
  if (action.social && g.socialOpenness < SOCIAL_AUTONOMY_THRESHOLD) {
    return { allowed: false, reason: 'social autonomy below threshold', requiresWakingConsent: false };
  }
  if (action.danger != null && action.danger > g.riskTolerance) {
    return { allowed: false, reason: 'exceeds risk tolerance', requiresWakingConsent: false };
  }
  return { allowed: true };
}

export const isPermitted = (a: AutonomousAction, g: Guardrails): boolean => evaluateAction(a, g).allowed;

export const requiresWakingConsent = (a: AutonomousAction): boolean =>
  a.costsCurrency || !a.reversible;

// ── Concrete current use: bounded realm selection ────────────────────────────

/**
 * Per-theme danger ratings (0-100). The overnight engine previously picked a
 * theme with `Math.random()`, ignoring the player entirely — a D6 gap. Selection
 * now respects risk tolerance and is biased by openness.
 */
export const THEME_DANGER: Record<string, number> = {
  forest: 20,
  cave: 35,
  ocean_depth: 45,
  ruins: 50,
  crystal_maze: 55,
  sky_citadel: 65,
  shadow_realm: 80,
  void: 90,
};

/**
 * Choose a realm the Eidolon may enter UNATTENDED: only themes within the
 * player's risk tolerance are eligible. Higher openness biases toward the more
 * adventurous (higher-danger, still-eligible) end. Deterministic given `rng`
 * (default Math.random) so it is testable. Always returns an eligible theme —
 * the safest available is the floor, so the result is never empty.
 */
export function selectThemeWithinGuardrails(
  themes: string[],
  g: Guardrails,
  rng: () => number = Math.random,
): string {
  const known = themes.filter((t) => t in THEME_DANGER);
  const pool = known.length ? known : themes;
  const eligible = pool.filter((t) => (THEME_DANGER[t] ?? 0) <= g.riskTolerance);
  // Floor guarantee: if risk tolerance is below every theme, take the single safest.
  const candidates = eligible.length
    ? eligible
    : [pool.slice().sort((a, b) => (THEME_DANGER[a] ?? 0) - (THEME_DANGER[b] ?? 0))[0]];

  // Openness weights selection toward bolder (higher-danger) eligible themes.
  const bias = g.openness / 100; // 0 = always safest, 1 = uniform over eligible
  const sorted = candidates.slice().sort((a, b) => (THEME_DANGER[a] ?? 0) - (THEME_DANGER[b] ?? 0));
  // With low openness, compress the random draw toward index 0 (safest).
  const r = rng();
  const skewed = Math.pow(r, 1 + (1 - bias) * 3); // bias→1: ~uniform; bias→0: hugs 0
  const idx = Math.min(sorted.length - 1, Math.floor(skewed * sorted.length));
  return sorted[idx];
}
