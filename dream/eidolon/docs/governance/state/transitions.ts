/**
 * Eidolon — Governance State Machine: transition functions (Layer 2).
 * Session 2 deliverable. Pairs with `./state_schema.ts`.
 *
 * Design rules (so the machine is "mathematically sound"):
 *  1. Every transition is a PURE function: (state, args) -> Result. No mutation of
 *     the input; a fresh state is returned on success.
 *  2. Every successful transition yields a state that passes `checkInvariants`.
 *     A transition that would break an invariant fails CLOSED (returns an error),
 *     it never returns a broken state.
 *  3. Failures are values, not exceptions (Result<T,E>), matching the project's
 *     `Result<T,E>` domain-layer convention (CLAUDE.md).
 *
 * Status: Draft v0.1 · 2026-06-13
 */

import {
  type ProjectState,
  type Phase,
  type DoctrineId,
  type InvariantViolation,
  type ISO8601,
  NON_SUSPENDABLE,
  PHASE_ORDER,
  phaseIndex,
  checkInvariants,
} from "./state_schema";

// ────────────────────────────────────────────────────────────────────────────
// Result type
// ────────────────────────────────────────────────────────────────────────────

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string; violations?: InvariantViolation[] };
export type Result<T> = Ok<T> | Err;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = (error: string, violations?: InvariantViolation[]): Err => ({
  ok: false,
  error,
  ...(violations ? { violations } : {}),
});

/** Structural deep clone; state is plain JSON so this is total and safe. */
function clone<T>(s: T): T {
  return JSON.parse(JSON.stringify(s)) as T;
}

/**
 * Guard wrapper: run `mutate` on a clone, then refuse to return a state that
 * violates any invariant. This is the single chokepoint that makes rule (2) hold
 * for every transition uniformly.
 */
function guarded(
  state: ProjectState,
  label: string,
  mutate: (draft: ProjectState) => string | null,
): Result<ProjectState> {
  const draft = clone(state);
  const reason = mutate(draft);
  if (reason) return err(`${label}: ${reason}`);
  const violations = checkInvariants(draft);
  if (violations.length > 0) {
    return err(`${label}: would violate invariants`, violations);
  }
  return ok(draft);
}

// ────────────────────────────────────────────────────────────────────────────
// phaseAdvance — move to the next phase iff gates pass and no blocking obligation
// remains. Rejects skipping phases.
// ────────────────────────────────────────────────────────────────────────────

export function phaseAdvance(state: ProjectState): Result<ProjectState> {
  return guarded(state, "phaseAdvance", (d) => {
    if (d.meta.phase === "SUNSET") return "cannot advance out of SUNSET";
    const idx = phaseIndex(d.meta.phase);
    if (idx >= PHASE_ORDER.length - 1) {
      return `already at terminal operating phase ${d.meta.phase}; only SUNSET remains (use enterSunset)`;
    }
    const next: Phase = PHASE_ORDER[idx + 1];

    // Gate check: every exit criterion of the CURRENT phase must be met.
    const gates = d.phaseGates[d.meta.phase];
    const unmet = gates.filter((g) => g.actual < g.target);
    if (unmet.length > 0) {
      return `unmet exit gates: ${unmet
        .map((g) => `${g.criterion} ${g.actual}/${g.target}`)
        .join(", ")}`;
    }

    // Obligation check: nothing unsatisfied may block the phase we are entering.
    const blocking = d.constitutional.obligations.filter(
      (o) => !o.satisfied && phaseIndex(next) >= phaseIndex(o.blocksPhase),
    );
    if (blocking.length > 0) {
      return `blocked by obligations: ${blocking.map((o) => o.id).join(", ")}`;
    }

    // Open Doctrine challenges block advancement (CONSTITUTION §3).
    const challenged = (Object.keys(d.constitutional.doctrines) as DoctrineId[]).filter(
      (id) => d.constitutional.doctrines[id].openChallenges > 0,
    );
    if (challenged.length > 0) {
      return `open doctrine challenges: ${challenged.join(", ")}`;
    }

    d.meta.phase = next;
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// phaseRollback — retreat to an earlier phase (e.g. pull monetization after a
// D3/D7 incident). Always permitted toward an earlier phase; never forward.
// ────────────────────────────────────────────────────────────────────────────

export function phaseRollback(
  state: ProjectState,
  target: Phase,
): Result<ProjectState> {
  return guarded(state, "phaseRollback", (d) => {
    if (target === "SUNSET") return "use enterSunset for SUNSET";
    if (phaseIndex(target) >= phaseIndex(d.meta.phase)) {
      return `target ${target} is not earlier than current ${d.meta.phase}`;
    }
    d.meta.phase = target;
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// satisfyObligation — mark a checkpoint debt paid (and seat the reviewer, which
// is the one obligation that also flips a structural flag).
// ────────────────────────────────────────────────────────────────────────────

export function satisfyObligation(
  state: ProjectState,
  obligationId: string,
  at: ISO8601,
): Result<ProjectState> {
  return guarded(state, "satisfyObligation", (d) => {
    const o = d.constitutional.obligations.find((x) => x.id === obligationId);
    if (!o) return `unknown obligation ${obligationId}`;
    if (o.satisfied) return `${obligationId} already satisfied`;
    o.satisfied = true;
    o.satisfiedAt = at;
    if (obligationId === "OBL_INDEPENDENT_REVIEWER") {
      d.constitutional.independentReviewerSeated = true;
    }
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// recordDoctrineChallenge / resolveDoctrineChallenge (CONSTITUTION §3).
// ────────────────────────────────────────────────────────────────────────────

export function recordDoctrineChallenge(
  state: ProjectState,
  doctrine: DoctrineId,
  at: ISO8601,
): Result<ProjectState> {
  return guarded(state, "recordDoctrineChallenge", (d) => {
    const rec = d.constitutional.doctrines[doctrine];
    rec.openChallenges += 1;
    rec.lastReview = at;
    return null;
  });
}

export function resolveDoctrineChallenge(
  state: ProjectState,
  doctrine: DoctrineId,
  at: ISO8601,
): Result<ProjectState> {
  return guarded(state, "resolveDoctrineChallenge", (d) => {
    const rec = d.constitutional.doctrines[doctrine];
    if (rec.openChallenges <= 0) return `${doctrine} has no open challenge`;
    rec.openChallenges -= 1;
    rec.lastReview = at;
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// invokeEmergency / restoreEmergency (CONSTITUTION §4).
// Emergency is subtractive-only and may never suspend a hard-limit Doctrine — the
// guard wrapper enforces the latter via INV_HARD_LIMITS, so an illegal suspend
// fails CLOSED automatically.
// ────────────────────────────────────────────────────────────────────────────

export function invokeEmergency(
  state: ProjectState,
  reason: string,
  suspend: DoctrineId[],
  declaredAt: ISO8601,
  expiresAt: ISO8601,
): Result<ProjectState> {
  return guarded(state, "invokeEmergency", (d) => {
    if (d.constitutional.activeEmergency) return "an emergency is already active";
    const illegal = suspend.filter((id) => NON_SUSPENDABLE.has(id));
    if (illegal.length > 0) {
      return `cannot suspend hard-limit Doctrine(s): ${illegal.join(", ")}`;
    }
    for (const id of suspend) d.constitutional.doctrines[id].status = "suspended";
    d.constitutional.activeEmergency = {
      reason,
      declaredAt,
      suspended: suspend,
      expiresAt,
      retrospectiveFiled: false,
    };
    return null;
  });
}

export function restoreEmergency(
  state: ProjectState,
  restoredAt: ISO8601,
  retrospectiveFiled: boolean,
): Result<ProjectState> {
  return guarded(state, "restoreEmergency", (d) => {
    const e = d.constitutional.activeEmergency;
    if (!e) return "no active emergency";
    if (!retrospectiveFiled) {
      return "retrospective must be filed before restoring (CONSTITUTION §4 accountability)";
    }
    for (const id of e.suspended) d.constitutional.doctrines[id].status = "active";
    e.restoredAt = restoredAt;
    e.retrospectiveFiled = true;
    d.constitutional.activeEmergency = null;
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// enterSunset (CONSTITUTION §5). Reachable from any operating phase; terminal.
// ────────────────────────────────────────────────────────────────────────────

export function enterSunset(state: ProjectState): Result<ProjectState> {
  return guarded(state, "enterSunset", (d) => {
    if (d.meta.phase === "SUNSET") return "already in SUNSET";
    d.meta.phase = "SUNSET";
    return null;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// forkState — produce an independent scenario copy for planning (meta-prompt
// state_fork). The fork shares no references with the original.
// ────────────────────────────────────────────────────────────────────────────

export function forkState(state: ProjectState): [ProjectState, ProjectState] {
  return [state, clone(state)];
}
