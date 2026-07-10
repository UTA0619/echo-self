# Phase A — Artifacts (`A_ALPHA`)

> Output of running [`phase_a_engine.md`](./phase_a_engine.md) against `INITIAL_STATE`
> (phase `A_ALPHA`, monetization OFF, 0 players). Session 3 deliverable.
> Status: Draft v0.1 · 2026-06-13
>
> **Phase goal:** prove the soul-twin is *honest and safe* before any real player or
> revenue. Exit = ready for `B_SOFT_LAUNCH`.

---

## 1. Issues

Each Issue: Doctrine(s) served · real path(s) · acceptance · advances which gate/obligation.
Priority **P0** = blocks Phase-A exit; **P1** = strongly recommended in Phase A.

### A-1 · Consent ledger (per-signal, revocable) — **P0**
- **Doctrine:** D4 (granular consent), D8 (minimization), D1 (sovereignty).
- **Paths:** new `backend/supabase/migrations/013_consent_ledger.sql` (+ RLS like
  `010_rls_delete_policies.sql`); new `apps/mobile/lib/features/consent/` (Clean
  Architecture); wire into Reality Sync + Async Social entry points.
- **Acceptance:** every reality signal (steps, sleep, HRV, emotion) and every social
  capability (visit, trade, duel, memory-exchange) has an explicit, independently
  toggleable consent row; revoking takes effect immediately with no feature penalty
  beyond the directly-consented effect; revocation is logged. No raw biometric/emotion
  data reaches Mixpanel/GameAnalytics/AppsFlyer (D8 assertion test).
- **Advances:** `OBL_CONSENT_LEDGER` → satisfied. Unblocks `B_SOFT_LAUNCH`.

### A-2 · Bounded-autonomy guardrails + waking-consent gate — **P0**
- **Doctrine:** D6 (bounded autonomy), D2 (serves not supplants), D10 (transparency).
- **Paths:** extend `packages/shared_types/lib/src/entities/eidolon_profile.dart`
  (today only `autoStrategy:'balanced'`) with `riskTolerance` and `socialOpenness`
  guardrails; enforce in `backend/supabase/functions/overnight-simulate/index.ts`;
  add a "waking-consent queue" for any overnight action that is irreversible or spends
  premium currency (it is deferred, not executed, until the player approves on next open).
- **Acceptance:** overnight sim provably cannot (a) act outside the player's guardrails,
  (b) spend premium currency, or (c) make an irreversible trade without a queued waking
  consent. A property test asserts `Action ∈ Permitted(Guardrails)` (ONT-2 forbidden
  corner: high-capability + low-reversibility + standing-authorization is unreachable).
- **Advances:** `OBL_D6_GUARDRAILS` → satisfied. Unblocks `B_SOFT_LAUNCH`.

### A-3 · Narrative-honesty validator for overnight reports — **P0**
- **Doctrine:** D5 (memory integrity & narrative honesty), D10.
- **Paths:** `backend/supabase/functions/_shared/overnight_prompt.ts`,
  `.../overnight-simulate/index.ts`, `_shared/ai_client.ts`.
- **Acceptance:** every dramatized beat in a generated report references a real event via
  a `MemoryEntry.sourceRef` (the provenance field already exists). A post-generation
  validator rejects/regenerates any report containing an event with no backing memory.
  Adversarial test: a prompt that tries to induce a fabricated "your Eidolon nearly died,
  buy a revive" beat is caught. Template-fallback outputs are labeled as such (D10).
- **Advances:** raises `metrics.complianceSignal` for D5; mitigates `RISK_AI_PROVIDER`.

### A-4 · Alpha stability to crash-free ≥ 99.5% — **P0**
- **Doctrine:** D7 (non-harm — an unstable companion is a harmful one), quality gate.
- **Paths:** Sentry + Crashlytics wiring across `apps/mobile/`; the overnight-sim and
  dungeon-gen hot paths; `melos run analyze`/`flutter analyze` zero-warning gate.
- **Acceptance:** `metrics.crashFreeSessions ≥ 99.5` sustained over the alpha cohort;
  startup < 3s, 60fps, memory < 200MB (CLAUDE.md gates); coverage ≥ 80%.
- **Advances:** `phaseGates.A_ALPHA[crashFreeSessions]` `actual` → ≥ 99.5.

### A-5 · "Why did my Eidolon do that?" provenance view — **P1**
- **Doctrine:** D10 (transparency), D6.
- **Paths:** `apps/mobile/lib/features/eidolon/` presentation; read the
  personality vector + retrieved `MemoryEntry`s + guardrail that produced an action.
- **Acceptance:** for any overnight action, the player can see a truthful, plain-language
  explanation grounded in personality + memory provenance + the active guardrail; the
  model that produced a given output (incl. GPT-4o-mini / template fallback) is disclosable.
- **Advances:** raises D10 `complianceSignal`; supports `OBL_OVERRIDE_FRICTION_METRIC`
  groundwork (you can only measure trust honestly once actions are explainable).

### A-6 · Real deletion, verified cross-store — **P1**
- **Doctrine:** D9 (dignified death), D1.
- **Paths:** `backend/supabase/migrations/010_rls_delete_policies.sql` (exists);
  add a deletion job spanning Firebase + Supabase + Cloudflare; attestation log.
- **Acceptance:** account deletion provably removes personality, all `MemoryEntry`
  rows, reality data, and chat across **all** stores (closes Review R5's "unverified
  cross-store" gap); an integration test asserts zero residual rows post-deletion.
- **Advances:** raises D9 `complianceSignal`; de-risks the eventual `OBL_GDPR_SOCIAL_TRACES`.

---

## 2. Milestones

### M-A1 · "Honest & Bounded Alpha" (Phase-A exit milestone)
- **Exit conditions (ALL required; each maps to a gate/obligation — DV-3):**
  - `OBL_CONSENT_LEDGER` satisfied (A-1).
  - `OBL_D6_GUARDRAILS` satisfied (A-2).
  - `phaseGates.A_ALPHA[crashFreeSessions].actual ≥ 99.5` (A-4).
  - D5 honesty validator live and passing the adversarial suite (A-3).
  - ≥ 20 alpha testers complete the full core loop for ≥ 7 consecutive days, with the
    overnight-trust signal observed (see Hypotheses).
  - `checkInvariants(state) === []` and no open Doctrine challenge.
  - → then `phaseAdvance(state)` legally yields `B_SOFT_LAUNCH`.
- **Kill conditions (any one → pause & convene a Doctrine review, per CONSTITUTION):**
  - **K1 (D5 impossible):** overnight narratives cannot be made reliably honest without
    gutting their emotional payload — i.e. honesty and delight are structurally opposed.
    *Then the core premise is broken; pivot or sunset, do not ship a lying companion.*
  - **K2 (no core-loop signal):** alpha testers show no return behavior the 5–15 min
    ritual cannot generate believable engagement *without* compulsion mechanics (which
    D7 forbids). *Then `H_RETENTION_VS_D2` trends toward falsified.*
  - **K3 (autonomy unsafe):** guardrails cannot bound overnight behavior provably (A-2
    property test cannot be made to pass). *Then delegation — the whole fantasy — is unsafe.*

### M-A0 · "Trust scaffolding" (internal, mid-phase)
- **Exit:** A-3, A-5, A-6 landed (the explainability + honesty + deletion spine), even
  before the cohort test. **Kill:** none (internal milestone).

---

## 3. State updates (apply as work lands)

```ts
// On A-1 done:
satisfyObligation(state, "OBL_CONSENT_LEDGER", <ISO>);
// On A-2 done:
satisfyObligation(state, "OBL_D6_GUARDRAILS", <ISO>);
// On A-4 reaching target:
state.phaseGates.A_ALPHA[0].actual = <measured crashFree, ≥99.5>;
// On A-3/A-5/A-6 raising compliance:
state.constitutional.doctrines.D5.complianceSignal = 95; // from 80
state.constitutional.doctrines.D6.complianceSignal = 85; // from 55
state.constitutional.doctrines.D9.complianceSignal = 85; // from 70
state.constitutional.doctrines.D4.complianceSignal = 90; // from 40
// Note: OBL_INDEPENDENT_REVIEWER & OBL_OVERRIDE_FRICTION_METRIC block C_MONETIZATION,
// NOT B, so they are NOT required to exit Phase A — but A-5 lays their groundwork.
```

After these, `phaseAdvance(state)` from `A_ALPHA` will succeed (gate met, both
B-blocking obligations satisfied, no open challenge).

## 4. Risk updates

- **RISK_AI_PROVIDER** (exists): mitigation strengthened by A-3 (report beats must cite
  `sourceRef`; fallback labeled). Lower impact 0.5 → 0.35 once A-3 lands.
- **NEW · RISK_CONSENT_DARK_PATTERN:** pressure to soften A-1 so revocation degrades the
  experience (nudging re-consent). prob 0.3 / impact 0.7. Mitigation: A-1 acceptance
  forbids penalty-on-revoke; D4 PR doctrine-check.
- **NEW · RISK_ALPHA_OVERFIT:** a 20-tester cohort is too small to trust the retention
  signal. prob 0.6 / impact 0.4. Mitigation: treat the cohort signal as *directional
  only*; do not let it confirm `H_RETENTION_VS_D2`, only fail it (asymmetric).

## 5. Hypothesis updates

- **H_OVERNIGHT_TRUST** — *tested in Phase A.* Measure: among alpha testers, overnight
  override rate **and** override friction (A-5 makes this measurable). Update posterior
  up only if override rate is low *while* friction is low. Target signal to advance: yes.
- **H_RETENTION_VS_D2** — *only partially testable in Phase A* (no monetization, tiny
  cohort). Phase A can **falsify** it (K2) but cannot confirm it. Keep `probability`
  unchanged on positive signal; lower it on K2 signal. Honest scope per DV-5.

## 6. Self-audit

- **Doctrine cross-check:** all six Issues cite Doctrines + real paths (DV-1 ✓). No Issue
  adds monetization or uncovered data collection (DV-2 ✓ — A-1 *is* the consent mechanism).
  Every exit criterion maps to a gate/obligation (DV-3 ✓). A-2 states reversibility and
  gates irreversible actions (DV-4 ✓).
- **Confidence:** A-1/A-2/A-4 **high** (clear acceptance, real paths). A-3 **medium** —
  "narrative honesty validator" is genuinely hard; an LLM validating LLM honesty has a
  regress problem (see flaw). A-5/A-6 **high**. Cohort exit criterion **low** confidence
  (RISK_ALPHA_OVERFIT).
- **Found flaw (≥1, mandatory):** **A-3's validator is circular.** Using an LLM to verify
  that an LLM-written report is grounded re-introduces the fabrication risk one layer up —
  a compromised/hallucinating validator passes a dishonest report. *Mitigation owed:* the
  validator must be **deterministic where possible** — assert that each report beat carries
  a structural `sourceRef` to an existing `MemoryEntry` row (a DB join, not a judgment),
  and reserve LLM judgment only for tone, never for "did this event happen." Logged as a
  constraint on A-3, not a nice-to-have.
- **Second flaw (altitude honesty, D10):** the "≥ 20 testers / 7 days" exit number is
  asserted, not derived. It is a placeholder pending a power analysis; treat it as a
  governance guess, not evidence. Flagged in the Known-Unknowns register.

---

### Checkpoint — Session 3
- [x] Phase A Engine is a complete, reusable, provider-agnostic sub-prompt with explicit
      inputs, mode, outputs, and self-validation rules (DV-1..5).
- [x] Phase A artifacts (6 Issues, 2 Milestones with Exit **and** Kill conditions, state /
      risk / hypothesis updates, self-audit) — all bound to real repo paths and Doctrines.
- [x] Exit criteria reconcile exactly with the state machine: clearing A-1/A-2/A-4 makes
      `phaseAdvance(A_ALPHA) → B_SOFT_LAUNCH` succeed (verified against Session-2 logic).
- [x] Engine found ≥1 real flaw in its own output (validator circularity; placeholder N).
- [ ] **Owed before Phase A "done":** power analysis to replace the placeholder cohort size.
- [ ] Phase B Engine (Session 4) does not begin until this checkpoint is reviewed.
