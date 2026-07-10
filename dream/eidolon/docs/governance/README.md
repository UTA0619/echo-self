# Eidolon — Governance System

The `civilization-forge v6.0` governance protocol, **grounded in the actual Eidolon
soul-bound RPG** (not as planetary fiction). Each "Session" is a layer of the system.

## Layers built so far

| Session | Layer | Artifact | Status |
|---|---|---|---|
| 1 | L0 Constitutional Core | [`CONSTITUTION.md`](./CONSTITUTION.md) | ✅ Draft v0.1 |
| 1 | L1 Ontological Foundation | [`ONTOLOGY.md`](./ONTOLOGY.md) | ✅ Draft v0.1 |
| 1 | L1 Philosophy | [`PHILOSOPHY.md`](./PHILOSOPHY.md) | ✅ Draft v0.1 |
| 2 | L2 State Machine | [`state/state_schema.ts`](./state/state_schema.ts), [`state/transitions.ts`](./state/transitions.ts) | ✅ Draft v0.1 |
| 3 | L3 Phase A Engine | [`phases/phase_a_engine.md`](./phases/phase_a_engine.md), [`phases/PHASE_A.md`](./phases/PHASE_A.md) | ✅ Draft v0.1 |

## Reading order

1. **`PHILOSOPHY.md`** — why this exists and at what (honest) altitude.
2. **`CONSTITUTION.md`** — the Ten Doctrines; the binding commitments.
3. **`ONTOLOGY.md`** — formal definitions the Doctrines depend on.
4. **`state/`** — the machine-readable project state that tracks Doctrine compliance,
   phase gates, and the open obligations from Session 1.

## The State Machine (Session 2)

`state/` is the machine-readable state of the **governance project** — which product
phase we are in, whether the Doctrines are honored, and which checkpoint obligations
block the next phase. It is *not* the Eidolon's in-game runtime state (that lives in
`packages/shared_types`); it references real telemetry from it.

Key properties (all proven by the soundness check):
- **Fails closed.** No transition can return a state that breaks an invariant.
- **Hard limits enforced.** Emergency Powers can never suspend D1/D3/D7/D9.
- **Obligations gate phases.** Monetization (`C_MONETIZATION`) is unreachable until an
  independent reviewer is seated; soft launch (`B_SOFT_LAUNCH`) until the consent ledger
  and D6 guardrails exist.

Run the soundness proof:

```bash
npx tsx docs/governance/state/soundness_check.ts   # 13 passed, 0 failed
npx tsc --strict --noEmit --skipLibCheck \
  --moduleResolution bundler --module esnext --target es2022 \
  docs/governance/state/*.ts                        # clean
```

## Open obligations (debts the system owes itself)

Tracked as `Obligation` records in `state/state_schema.ts`; each blocks a named phase:

| Obligation | Doctrine | Blocks | From |
|---|---|---|---|
| `OBL_CONSENT_LEDGER` | D4 | `B_SOFT_LAUNCH` | Review R2 |
| `OBL_D6_GUARDRAILS` | D6 | `B_SOFT_LAUNCH` | Review R1 |
| `OBL_INDEPENDENT_REVIEWER` | D3 | `C_MONETIZATION` | Session 1 self-audit |
| `OBL_OVERRIDE_FRICTION_METRIC` | D2 | `C_MONETIZATION` | ONT-3 self-audit |
| `OBL_GDPR_SOCIAL_TRACES` | D9 | `D_SOCIAL_SCALE` | ONT-5 / Review R5 |

## Phase Engines (Session 3+)

`phases/` holds the Phase Engines (Layer 3): reusable, provider-agnostic sub-prompts that
take the current `ProjectState` and emit phase-specific Issues, Milestones (with Exit
**and** Kill conditions), and state/risk/hypothesis updates — each bound to a real repo
path and a Doctrine. Phase A (`A_ALPHA`) is built; its exit criteria reconcile exactly
with the state machine (clearing `OBL_CONSENT_LEDGER` + `OBL_D6_GUARDRAILS` + the
crash-free gate makes `phaseAdvance(A_ALPHA) → B_SOFT_LAUNCH` succeed — see
`soundness_check.ts` test 3).

## Not yet built

Sessions 4+ (Phase B–E Engines, Cross-Cutting Engines, Strategic Game / Reflexivity
Engines, Reader Views, Meta-Cognition, omitted topics T1–T10). Each begins only after the
prior session's checkpoint is reviewed.
