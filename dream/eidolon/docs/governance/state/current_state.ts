/**
 * Eidolon — CURRENT governance state (evolves from INITIAL_STATE).
 *
 * Reflects the Phase-A server-side enforcement work actually landed in this branch:
 *   - D4 consent gate + ledger schema + audit  (consent.ts, 013_consent_ledger.sql)
 *   - D5 narrative-honesty validator            (narrative_honesty.ts, wired in)
 *   - D6 bounded-autonomy guardrails + columns  (guardrails.ts, 014, wired in)
 *
 * HONESTY NOTE (Doctrine D10): the SERVER halves of the two B-blocking obligations
 * are done and tested, but a player still cannot *revoke consent* or *tune guardrails*
 * without the Dart client UI — which could not be built here (no Flutter toolchain).
 * So we do NOT pretend Phase A is exitable. The original obligations are re-scoped to
 * their server half (satisfied) and two CLIENT obligations are added that still block
 * B_SOFT_LAUNCH. `phaseAdvance(CURRENT_STATE)` therefore still fails — correctly.
 */

import { INITIAL_STATE, type ProjectState, type Obligation } from "./state_schema";

const NOW = "2026-06-13T12:00:00Z";

// Deep clone so we never mutate the canonical baseline.
const s: ProjectState = JSON.parse(JSON.stringify(INITIAL_STATE));

s.meta.timestamp = NOW;

// ── Doctrine compliance raised by tested server-side enforcement ──────────────
s.constitutional.doctrines.D4.complianceSignal = 75; // gate + schema + audit (UI owed)
s.constitutional.doctrines.D5.complianceSignal = 95; // deterministic validator live
s.constitutional.doctrines.D6.complianceSignal = 85; // guardrails + columns + wired
s.constitutional.doctrines.D8.complianceSignal = 85; // reality minimization enforced
for (const id of ["D4", "D5", "D6", "D8"] as const) {
  s.constitutional.doctrines[id].lastReview = NOW;
}

// ── Re-scope the two original B-blockers to their (now satisfied) server half ──
function reScope(id: string, description: string): void {
  const o = s.constitutional.obligations.find((x) => x.id === id);
  if (o) {
    o.description = description;
    o.satisfied = true;
    o.satisfiedAt = NOW;
  }
}
reScope(
  "OBL_CONSENT_LEDGER",
  "[server] consent gate + consent_grants/consent_events schema + audit trigger. DONE.",
);
reScope(
  "OBL_D6_GUARDRAILS",
  "[server] guardrail enforcement in overnight-simulate + risk/social columns. DONE.",
);

// ── Add the CLIENT obligations that still block soft launch ───────────────────
const clientObligations: Obligation[] = [
  {
    id: "OBL_CONSENT_UI",
    doctrine: "D4",
    description:
      "Dart: per-signal consent toggles + revoke flow (a player must be able to revoke). Needs Flutter toolchain.",
    blocksPhase: "B_SOFT_LAUNCH",
    satisfied: false,
  },
  {
    id: "OBL_D6_GUARDRAILS_UI",
    doctrine: "D6",
    description:
      "Dart: settings UI to tune guardrails (EidolonProfile risk/social fields + data mapping now done). Needs UI build.",
    blocksPhase: "B_SOFT_LAUNCH",
    satisfied: false,
  },
];
s.constitutional.obligations.push(...clientObligations);

// ── Risk update: A-3 mitigation landed, lower RISK_AI_PROVIDER impact ─────────
s.risks.RISK_AI_PROVIDER.impact = 0.35;
s.risks.RISK_AI_PROVIDER.mitigation =
  "Deterministic D5 screen + provenance assert live; template fallback labeled. (was 0.5)";
s.risks.RISK_AI_PROVIDER.lastReview = NOW;

// ── D3 violation FOUND then FIXED (issue #121). The meta-cognition layer caught a
// real pay-to-win catalog (≈15/18 items granted power); it has now been converted to
// cosmetic/story-only and no_power_for_pay_test.dart enforces it forever, so
// powerForPaySkuCount is back to 0 and INV_NO_POWER_FOR_PAY is satisfied.
s.metrics.powerForPaySkuCount = 0;
s.constitutional.doctrines.D3.complianceSignal = 95;
s.constitutional.doctrines.D3.openChallenges = 0;
s.constitutional.doctrines.D3.lastReview = NOW;
s.risks.RISK_GACHA_P2W = {
  description:
    "Gacha selling power for real-money crystals (D3). FIXED — catalog is cosmetic/story-only (#121).",
  probability: 0.05, // residual: a future item could regress; the audit test guards it
  impact: 0.9,
  mitigation:
    "Catalog converted; no_power_for_pay_test.dart enforces powerForPaySkuCount === 0 in CI.",
  lastReview: NOW,
};

export const CURRENT_STATE: ProjectState = s;
