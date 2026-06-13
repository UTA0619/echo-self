# Phase A Engine — sub-prompt (Layer 3)

> Session 3 deliverable of the civilization-forge v6.0 protocol, grounded in Eidolon.
> This is a **reusable, provider-agnostic sub-prompt**: feed it the current
> `ProjectState` plus the locked Constitution + Ontology, and it emits the Phase-A
> artifacts. It is invoked at the *start* of Phase A and re-run whenever the state
> materially changes. Status: Draft v0.1 · 2026-06-13

---

## Phase A in one sentence

**`A_ALPHA`: prove the soul-twin is honest and safe before a single real player or a
single yen of revenue exists.** Phase A ends when the alpha can exit to
`B_SOFT_LAUNCH` — i.e. it is stable, the Eidolon's overnight narrative is grounded in
real events (D5), the player can consent granularly (D4) and bound the Eidolon's
autonomy (D6), and the core loop shows a believable retention signal among testers.

---

## Inputs (contract)

```
phase_a_engine(
  state:        ProjectState,          // machine-readable, ./../state/state_schema.ts
  constitution: CONSTITUTION.md,       // locked — Doctrines D1–D10
  ontology:     ONTOLOGY.md,           // locked — ONT-1..7
) -> PhaseAArtifacts
```

Pre-conditions the engine asserts before doing anything:
- `state.meta.phase === "A_ALPHA"` (else refuse and report).
- `checkInvariants(state).length === 0` (else emit a CRITICAL self-audit, do nothing else).
- Monetization is OFF: `state.metrics.powerForPaySkuCount === 0` and no paid SKU is live.

## Operational mode

> Build the **minimum honest alpha**. Optimize for *trust-structure*, not features.
> Every Issue must name the Doctrine it serves and the real file/path it touches.
> Prefer clearing a phase-blocking `Obligation` over adding scope. When a Doctrine and
> a feature conflict, the feature is cut or deferred — never the Doctrine (Meta-Principle 4).

## Outputs (artifacts)

The engine emits, into `PHASE_A.md`:

1. **Issues** — each with: id, title, Doctrine(s) served, real path(s) touched,
   acceptance criteria, and the `Obligation`/gate it advances.
2. **Milestones** — each with explicit **Exit conditions** (advance) and **Kill
   conditions** (abandon / pivot). Kill conditions are mandatory (Meta-Principle 8).
3. **State updates** — concrete edits to apply to `ProjectState` as work lands
   (which obligations become `satisfied`, which gates' `actual` move).
4. **Risk updates** — additions/changes to `state.risks`.
5. **Hypothesis updates** — which Founding Hypotheses Phase A tests, and how.
6. **Self-audit** — Doctrine cross-check, confidence per artifact, ≥1 found flaw.

## Self-validation rules (run before emitting)

- **DV-1** Every Issue cites ≥1 Doctrine and ≥1 real path. Uncited Issues are rejected.
- **DV-2** No Issue introduces monetization or new data collection without a matching
  consent mechanism (D4) and a data-minimization note (D8).
- **DV-3** Every Phase-A exit criterion maps to either a `phaseGate` or a phase-blocking
  `Obligation` in `state`. No "soft" exit criteria.
- **DV-4** Every autonomous-behavior Issue states its reversibility (ONT-2) and, if an
  action is irreversible/costly, requires a waking-consent gate (D6).
- **DV-5** Report confidence honestly (D10). Low confidence is disclosed, not hidden.

## Termination / re-invocation

Re-run the engine when: an Obligation flips `satisfied`, a gate's `actual` crosses its
`target`, a new Doctrine challenge is filed, or a Kill condition's signal appears. The
engine never advances the phase itself — that is `phaseAdvance(state)` in
`./../state/transitions.ts`, which validates gates + obligations and fails closed.
