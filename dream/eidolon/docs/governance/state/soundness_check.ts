/**
 * Eidolon — Governance State Machine soundness check (Session 2 checkpoint proof).
 * Run:  npx tsx docs/governance/state/soundness_check.ts
 *
 * This is not a unit-test-runner spec; it is a self-contained, runnable proof that
 * the state machine holds its invariants and fails CLOSED on illegal transitions.
 * It doubles as executable documentation of the intended behavior.
 */

import { INITIAL_STATE, checkInvariants, type ProjectState } from "./state_schema";
import {
  phaseAdvance,
  satisfyObligation,
  invokeEmergency,
  restoreEmergency,
  forkState,
  type Result,
} from "./transitions";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function expectOk<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`expected Ok, got Err: ${r.error}`);
  return r.value;
}

console.log("Eidolon governance state machine — soundness check\n");

// 1. Initial state is sound.
check("INITIAL_STATE passes all invariants", checkInvariants(INITIAL_STATE).length === 0);

// 2. Cannot advance out of A_ALPHA: crash-free gate unmet AND obligations block B.
{
  const r = phaseAdvance(INITIAL_STATE);
  check("phaseAdvance from A_ALPHA fails (gates + obligations)", !r.ok);
  if (!r.ok) console.log(`     reason: ${r.error}`);
}

// 3. Reachability: drive A_ALPHA -> B_SOFT_LAUNCH by meeting the gate and the two
//    obligations that block B. Demonstrates B is reachable via valid transitions only.
{
  let s: ProjectState = JSON.parse(JSON.stringify(INITIAL_STATE));
  s.phaseGates.A_ALPHA[0].actual = 99.6; // crash-free gate met
  s = expectOk(satisfyObligation(s, "OBL_CONSENT_LEDGER", "2026-07-01T00:00:00Z"));
  s = expectOk(satisfyObligation(s, "OBL_D6_GUARDRAILS", "2026-07-01T00:00:00Z"));
  const r = phaseAdvance(s);
  check("A_ALPHA -> B_SOFT_LAUNCH reachable after gate+obligations", r.ok);
  if (r.ok) check("resulting state is sound", checkInvariants(r.value).length === 0);
}

// 4. Hard-limit: emergency cannot suspend D3 (No Power for Pay) — fails CLOSED.
{
  const r = invokeEmergency(
    INITIAL_STATE,
    "test illegal suspend",
    ["D3"],
    "2026-07-01T00:00:00Z",
    "2026-07-10T00:00:00Z",
  );
  check("invokeEmergency suspending D3 (hard limit) fails closed", !r.ok);
}

// 5. Legal emergency on D5, then restore requires a filed retrospective.
{
  const e = expectOk(
    invokeEmergency(
      INITIAL_STATE,
      "narrative generator incident",
      ["D5"],
      "2026-07-01T00:00:00Z",
      "2026-07-10T00:00:00Z",
    ),
  );
  check("emergency suspending D5 succeeds", e.constitutional.activeEmergency !== null);
  check("D5 marked suspended", e.constitutional.doctrines.D5.status === "suspended");
  check("suspended state still sound (D5 not a hard limit)", checkInvariants(e).length === 0);

  const noRetro = restoreEmergency(e, "2026-07-05T00:00:00Z", false);
  check("restore without retrospective fails", !noRetro.ok);

  const restored = expectOk(restoreEmergency(e, "2026-07-05T00:00:00Z", true));
  check("restore with retrospective succeeds", restored.constitutional.activeEmergency === null);
  check("D5 reactivated", restored.constitutional.doctrines.D5.status === "active");
}

// 6. A directly-corrupted state (reviewer absent at C_MONETIZATION) is caught by
//    checkInvariants — proving the invariant, independent of the transitions.
{
  const corrupt: ProjectState = JSON.parse(JSON.stringify(INITIAL_STATE));
  corrupt.meta.phase = "C_MONETIZATION"; // illegally hand-set, reviewer not seated
  const v = checkInvariants(corrupt);
  check(
    "C_MONETIZATION without reviewer is flagged by invariants",
    v.some((x) => x.invariant === "INV_REVIEWER_BEFORE_MONETIZATION"),
  );
}

// 7. forkState produces an independent copy (mutating the fork never touches origin).
{
  const [orig, fork] = forkState(INITIAL_STATE);
  fork.metrics.mau = 9999;
  check("forkState is reference-independent", orig.metrics.mau === 0 && fork.metrics.mau === 9999);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
