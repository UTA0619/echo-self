// Run: npx tsx docs/governance/state/current_state.test.ts
// Proves the meta-cognition layer DETECTS the live D3 gacha violation (#121), that
// Phase A is honestly not yet exitable, and that the full exit path requires fixing
// D3 *and* the client UI *and* the crash-free gate.
import assert from "node:assert/strict";
import { checkInvariants } from "./state_schema";
import { CURRENT_STATE } from "./current_state";
import { phaseAdvance, satisfyObligation, resolveDoctrineChallenge } from "./transitions";

let pass = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

console.log("current_state (Phase-A progress) tests\n");

t("meta-cognition DETECTS the live D3 gacha violation (#121)", () => {
  const v = checkInvariants(CURRENT_STATE);
  assert.ok(
    v.some((x) => x.invariant === "INV_NO_POWER_FOR_PAY"),
    "expected INV_NO_POWER_FOR_PAY to fire on the real pay-to-win catalog",
  );
});

t("server obligations are satisfied", () => {
  const by = (id: string) => CURRENT_STATE.constitutional.obligations.find((o) => o.id === id);
  assert.equal(by("OBL_CONSENT_LEDGER")?.satisfied, true);
  assert.equal(by("OBL_D6_GUARDRAILS")?.satisfied, true);
});

t("phaseAdvance STILL fails — client UI obligations + crash-free gate remain (honest)", () => {
  const r = phaseAdvance(CURRENT_STATE);
  assert.equal(r.ok, false);
  if (!r.ok) console.log(`     reason: ${r.error}`);
});

t("full exit path requires fixing D3 + client UI + crash-free gate", () => {
  let s = JSON.parse(JSON.stringify(CURRENT_STATE));

  // While D3 is violated the state is invalid, so EVERY transition fails closed —
  // the system must be repaired before any progress (a strong fail-closed property).
  assert.equal(phaseAdvance(s).ok, false);
  assert.equal(satisfyObligation(s, "OBL_CONSENT_UI", "2026-08-01T00:00:00Z").ok, false);

  // Repair D3: catalog converted to cosmetic/story-only (#121) + challenge resolved.
  s.metrics.powerForPaySkuCount = 0;
  s = (resolveDoctrineChallenge(s, "D3", "2026-08-01T00:00:00Z") as { ok: true; value: typeof s }).value;

  // Now the remaining Phase-A work can land: crash-free gate + client UI obligations.
  s.phaseGates.A_ALPHA[0].actual = 99.6;
  s = (satisfyObligation(s, "OBL_CONSENT_UI", "2026-08-01T00:00:00Z") as { ok: true; value: typeof s }).value;
  s = (satisfyObligation(s, "OBL_D6_GUARDRAILS_UI", "2026-08-01T00:00:00Z") as { ok: true; value: typeof s }).value;

  const r = phaseAdvance(s);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.meta.phase, "B_SOFT_LAUNCH");
});

console.log(`\n${pass} assertions passed`);
