/**
 * Eidolon — Governance State Machine (Layer 2)
 * Session 2 deliverable of the civilization-forge v6.0 protocol, grounded in the
 * actual Eidolon soul-bound RPG.
 *
 * IMPORTANT — scope. This is the machine-readable state of the *governance project*
 * (which product phase are we in, are the Doctrines being honored, which checkpoint
 * obligations block the next phase), NOT the Eidolon's in-game runtime state. The
 * in-game state lives in `packages/shared_types` (EidolonProfile, MemoryEntry, ...).
 * This file references those real metrics; it does not replace them.
 *
 * This module is intentionally dependency-free, pure, and side-effect-free so it can
 * be unit-tested in isolation and reasoned about formally. Transition functions live
 * in `./transitions.ts`.
 *
 * Status: Draft v0.1 · 2026-06-13
 */

// ────────────────────────────────────────────────────────────────────────────
// Primitive aliases
// ────────────────────────────────────────────────────────────────────────────

/** ISO-8601 timestamp, e.g. "2026-06-13T00:00:00Z". */
export type ISO8601 = string;

/** The ten Doctrines from CONSTITUTION.md. */
export type DoctrineId =
  | "D1" // Sovereignty of the Player Self
  | "D2" // The Eidolon Serves, Never Supplants
  | "D3" // No Power for Pay
  | "D4" // Granular, Revocable Consent
  | "D5" // Memory Integrity & Narrative Honesty
  | "D6" // Bounded Autonomy
  | "D7" // Psychological Non-Harm
  | "D8" // Data Minimalism
  | "D9" // Continuity & Dignified Death
  | "D10"; // Transparency of the Machine

/**
 * Core-trust Doctrines may never be suspended, even under Emergency Powers
 * (CONSTITUTION §4 hard limits). This subset is enforced by invariant INV_HARD_LIMITS.
 */
export const NON_SUSPENDABLE: ReadonlySet<DoctrineId> = new Set<DoctrineId>([
  "D1",
  "D3",
  "D7",
  "D9",
]);

/**
 * Product phases, mapped from the meta-prompt's abstract A–E to real Eidolon
 * milestones. Ordering is total and is the only legal advance path.
 */
export type Phase =
  | "A_ALPHA" //  internal alpha; no real players, no monetization
  | "B_SOFT_LAUNCH" //  limited players, telemetry on, monetization OFF
  | "C_MONETIZATION" //  paid tiers + gacha live
  | "D_SOCIAL_SCALE" //  async social / guilds at scale
  | "E_MATURE" //  steady-state operation
  | "SUNSET"; //  dignified wind-down (CONSTITUTION §5)

export const PHASE_ORDER: readonly Phase[] = [
  "A_ALPHA",
  "B_SOFT_LAUNCH",
  "C_MONETIZATION",
  "D_SOCIAL_SCALE",
  "E_MATURE",
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Sub-state shapes
// ────────────────────────────────────────────────────────────────────────────

export type DoctrineStatus = "active" | "amended" | "suspended";

export interface DoctrineRecord {
  status: DoctrineStatus;
  lastReview: ISO8601;
  /** Open DOCTRINE-CHALLENGE issues (CONSTITUTION §3). > 0 blocks phase advance. */
  openChallenges: number;
  /**
   * 0–100 self-assessed compliance signal. Qualitative until a metric backs it;
   * see `metrics` for the quantitative anchors (e.g. D3 ← powerForPaySkuCount).
   */
  complianceSignal: number;
}

/**
 * A checkpoint obligation is a debt the system owes itself (the open items at the
 * end of Session 1). Each blocks a specific phase until `satisfied`.
 */
export interface Obligation {
  id: string;
  doctrine: DoctrineId;
  description: string;
  /** The earliest phase that may NOT be entered while this is unsatisfied. */
  blocksPhase: Phase;
  satisfied: boolean;
  satisfiedAt?: ISO8601;
}

export type HypothesisStatus =
  | "active"
  | "confirmed"
  | "falsified"
  | "inconclusive";

export interface Hypothesis {
  statement: string;
  status: HypothesisStatus;
  /** Bayesian posterior in [0,1] that the hypothesis holds. */
  probability: number;
  lastTest: ISO8601;
}

export interface PhaseGate {
  criterion: string;
  target: number;
  actual: number;
  confidence: "low" | "medium" | "high";
}

export interface RiskRecord {
  description: string;
  probability: number; // [0,1]
  impact: number; // [0,1]
  mitigation: string;
  lastReview: ISO8601;
}

/**
 * Quantitative anchors for Doctrine compliance and phase gates. These are the
 * "externalities" of the meta-prompt, bound to real Eidolon telemetry.
 */
export interface Metrics {
  /** Monthly active users. Phase-gate input. */
  mau: number;
  /** Crash-free sessions %, target > 99.5 (CLAUDE.md quality gate). */
  crashFreeSessions: number;
  /** D1 retention %; a *healthy* retention proxy for hypothesis H_RETENTION_VS_D2. */
  d1Retention: number;
  /**
   * Fraction [0,1] of overnight runs the player overrides. ONT-3 trust proxy.
   * MUST be read alongside `overrideFriction` and `declaredTrust` (self-audit flaw).
   */
  overnightOverrideRate: number;
  /** Companion: how hard overriding is, [0,1]. Guards against gaming overrideRate. */
  overrideFriction: number;
  /** Declared-trust survey score [0,1] (ONT-3). */
  declaredTrust: number;
  /**
   * D3 hard anchor: count of SKUs that grant gameplay power. MUST be 0, always.
   * Enforced by invariant INV_NO_POWER_FOR_PAY.
   */
  powerForPaySkuCount: number;
  /** D7 wellbeing signal [0,1]; lower is worse. Threshold-gated. */
  wellbeingSignal: number;
}

export interface Network {
  eidolonCount: number;
  activeEidolons: number;
  socialInteractionsTotal: number;
  jurisdictions: string[]; // e.g. ["JP", "EU"]
}

export interface EmergencyRecord {
  reason: string;
  declaredAt: ISO8601;
  /** Doctrines whose *operational consequence* was suspended (never a hard-limit one). */
  suspended: DoctrineId[];
  /** Emergency powers auto-expire (CONSTITUTION §4). */
  expiresAt: ISO8601;
  restoredAt?: ISO8601;
  retrospectiveFiled: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// The top-level state
// ────────────────────────────────────────────────────────────────────────────

export interface ProjectState {
  meta: {
    schemaVersion: string;
    timestamp: ISO8601;
    phase: Phase;
    elapsedMonths: number;
    runwayMonths: number;
  };
  constitutional: {
    doctrines: Record<DoctrineId, DoctrineRecord>;
    obligations: Obligation[];
    /** True once an independent reviewer with binding flag-off power is seated. */
    independentReviewerSeated: boolean;
    activeEmergency: EmergencyRecord | null;
  };
  hypotheses: Record<string, Hypothesis>;
  phaseGates: Record<Phase, PhaseGate[]>;
  risks: Record<string, RiskRecord>;
  metrics: Metrics;
  network: Network;
}

// ────────────────────────────────────────────────────────────────────────────
// Invariants — properties that MUST hold in every reachable state.
// `checkInvariants` returns the list of violations ([] === sound).
// ────────────────────────────────────────────────────────────────────────────

export interface InvariantViolation {
  invariant: string;
  detail: string;
}

export function checkInvariants(s: ProjectState): InvariantViolation[] {
  const v: InvariantViolation[] = [];

  // INV_NO_POWER_FOR_PAY (D3): money never buys power. Non-negotiable, all phases.
  if (s.metrics.powerForPaySkuCount !== 0) {
    v.push({
      invariant: "INV_NO_POWER_FOR_PAY",
      detail: `D3 violated: ${s.metrics.powerForPaySkuCount} power-granting SKU(s) exist; must be 0.`,
    });
  }

  // INV_HARD_LIMITS: a hard-limit Doctrine may never be suspended (CONSTITUTION §4).
  const e = s.constitutional.activeEmergency;
  if (e) {
    for (const d of e.suspended) {
      if (NON_SUSPENDABLE.has(d)) {
        v.push({
          invariant: "INV_HARD_LIMITS",
          detail: `Emergency suspends ${d}, which is a non-suspendable hard limit.`,
        });
      }
    }
  }

  // INV_REVIEWER_BEFORE_MONETIZATION: must not be at/after C_MONETIZATION without
  // an independent reviewer seated (Session-1 open obligation; CONSTITUTION §3/§6).
  if (
    phaseIndex(s.meta.phase) >= phaseIndex("C_MONETIZATION") &&
    s.meta.phase !== "SUNSET" &&
    !s.constitutional.independentReviewerSeated
  ) {
    v.push({
      invariant: "INV_REVIEWER_BEFORE_MONETIZATION",
      detail: `Phase ${s.meta.phase} reached without an independent reviewer seated.`,
    });
  }

  // INV_OBLIGATIONS_RESPECTED: no unsatisfied obligation whose blocked phase we have
  // already entered.
  for (const o of s.constitutional.obligations) {
    if (
      !o.satisfied &&
      s.meta.phase !== "SUNSET" &&
      phaseIndex(s.meta.phase) >= phaseIndex(o.blocksPhase)
    ) {
      v.push({
        invariant: "INV_OBLIGATIONS_RESPECTED",
        detail: `Obligation "${o.id}" (blocks ${o.blocksPhase}) unsatisfied at phase ${s.meta.phase}.`,
      });
    }
  }

  // INV_PROBABILITIES_BOUNDED: all probabilities/fractions in [0,1].
  const fracs: Array<[string, number]> = [
    ["d1Retention/100", s.metrics.d1Retention / 100],
    ["overnightOverrideRate", s.metrics.overnightOverrideRate],
    ["overrideFriction", s.metrics.overrideFriction],
    ["declaredTrust", s.metrics.declaredTrust],
    ["wellbeingSignal", s.metrics.wellbeingSignal],
  ];
  for (const [name, x] of fracs) {
    if (x < 0 || x > 1) {
      v.push({
        invariant: "INV_PROBABILITIES_BOUNDED",
        detail: `${name} = ${x} is outside [0,1].`,
      });
    }
  }

  return v;
}

/** Total order over phases; SUNSET is reachable from anywhere and sits last. */
export function phaseIndex(p: Phase): number {
  if (p === "SUNSET") return PHASE_ORDER.length; // after E_MATURE
  return PHASE_ORDER.indexOf(p);
}

// ────────────────────────────────────────────────────────────────────────────
// Initial state — the genuine state of Eidolon as of this Session.
// ────────────────────────────────────────────────────────────────────────────

const NOW: ISO8601 = "2026-06-13T00:00:00Z";

function doctrine(complianceSignal: number): DoctrineRecord {
  return { status: "active", lastReview: NOW, openChallenges: 0, complianceSignal };
}

export const INITIAL_STATE: ProjectState = {
  meta: {
    schemaVersion: "0.1.0",
    timestamp: NOW,
    phase: "A_ALPHA",
    elapsedMonths: 0,
    runwayMonths: 12,
  },
  constitutional: {
    doctrines: {
      D1: doctrine(90),
      D2: doctrine(70), // tension with retention target; unproven
      D3: doctrine(100), // schema has no power-for-pay SKU (review R4)
      D4: doctrine(40), // no consent ledger yet (review R2)
      D5: doctrine(80), // source/sourceRef provenance exists (review R3)
      D6: doctrine(55), // only autoStrategy guardrail in schema (review R1)
      D7: doctrine(60),
      D8: doctrine(75),
      D9: doctrine(70), // RLS delete exists; cross-store unverified (review R5)
      D10: doctrine(80),
    },
    obligations: [
      {
        id: "OBL_INDEPENDENT_REVIEWER",
        doctrine: "D3",
        description:
          "Seat ≥1 independent reviewer with binding flag-off power before monetization.",
        blocksPhase: "C_MONETIZATION",
        satisfied: false,
      },
      {
        id: "OBL_OVERRIDE_FRICTION_METRIC",
        doctrine: "D2",
        description:
          "Track override friction & declared trust alongside override rate (ONT-3 self-audit).",
        blocksPhase: "C_MONETIZATION",
        satisfied: false,
      },
      {
        id: "OBL_GDPR_SOCIAL_TRACES",
        doctrine: "D9",
        description:
          "Legal review: post-deletion anonymized social traces vs GDPR/APPI erasure (ONT-5).",
        blocksPhase: "D_SOCIAL_SCALE",
        satisfied: false,
      },
      {
        id: "OBL_CONSENT_LEDGER",
        doctrine: "D4",
        description:
          "Add per-signal, revocable consent ledger (steps/sleep/HRV/emotion + social).",
        blocksPhase: "B_SOFT_LAUNCH",
        satisfied: false,
      },
      {
        id: "OBL_D6_GUARDRAILS",
        doctrine: "D6",
        description:
          "Model risk-tolerance & social-openness guardrails + waking-consent gate for irreversible overnight actions.",
        blocksPhase: "B_SOFT_LAUNCH",
        satisfied: false,
      },
    ],
    independentReviewerSeated: false,
    activeEmergency: null,
  },
  hypotheses: {
    H_RETENTION_VS_D2: {
      statement:
        "Healthy D1/D7-compliant retention is achievable without engineering dependency (D2).",
      status: "active",
      probability: 0.5,
      lastTest: NOW,
    },
    H_OVERNIGHT_TRUST: {
      statement:
        "Players will let the Eidolon act overnight within guardrails (low, low-friction override rate).",
      status: "active",
      probability: 0.55,
      lastTest: NOW,
    },
  },
  phaseGates: {
    A_ALPHA: [
      { criterion: "crashFreeSessions", target: 99.5, actual: 0, confidence: "low" },
    ],
    B_SOFT_LAUNCH: [
      { criterion: "mau", target: 1000, actual: 0, confidence: "low" },
      { criterion: "d1Retention", target: 30, actual: 0, confidence: "low" },
    ],
    C_MONETIZATION: [
      { criterion: "mau", target: 5000, actual: 0, confidence: "low" },
    ],
    D_SOCIAL_SCALE: [
      { criterion: "mau", target: 15000, actual: 0, confidence: "low" },
    ],
    E_MATURE: [
      { criterion: "mau", target: 25000, actual: 0, confidence: "low" },
    ],
    SUNSET: [],
  },
  risks: {
    RISK_DEPENDENCY: {
      description: "Retention pressure drives D2/D7-violating compulsion mechanics.",
      probability: 0.4,
      impact: 0.8,
      mitigation: "Wellbeing instrumentation (T8); D7 PR doctrine-check.",
      lastReview: NOW,
    },
    RISK_AI_PROVIDER: {
      description:
        "Claude/GPT provider change degrades narrative honesty (D5) via template fallback.",
      probability: 0.5,
      impact: 0.5,
      mitigation: "Fallback chain + report beats must cite memory sourceRef.",
      lastReview: NOW,
    },
  },
  metrics: {
    mau: 0,
    crashFreeSessions: 100,
    d1Retention: 0,
    overnightOverrideRate: 0,
    overrideFriction: 0,
    declaredTrust: 0,
    powerForPaySkuCount: 0,
    wellbeingSignal: 1,
  },
  network: {
    eidolonCount: 0,
    activeEidolons: 0,
    socialInteractionsTotal: 0,
    jurisdictions: ["JP"],
  },
};
