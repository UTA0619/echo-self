// Run: npx tsx docs/governance/state/current_state.test.ts
// Proves the meta-cognition layer DETECTS the live D3 gacha violation (#121), that
// Phase A is honestly not yet exitable, and that the full exit path requires fixing
// D3 *and* the client UI *and* the crash-free gate.
import assert from "node:assert/strict";
import { checkInvariants } from "./state_schema";
import { CURRENT_STATE } from "./current_state";
import { phaseAdvance, satisfyObligation } from "./transitions";

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

t("D3 gacha violation is fixed — CURRENT_STATE passes all invariants (#121)", () => {
  assert.equal(checkInvariants(CURRENT_STATE).length, 0);
  assert.equal(CURRENT_STATE.metrics.powerForPaySkuCount, 0);
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

t("exit path works once client UI obligations + crash-free gate land", () => {
  let s = JSON.parse(JSON.stringify(CURRENT_STATE));
  s.phaseGates.A_ALPHA[0].actual = 99.6; // crash-free met
  s = (satisfyObligation(s, "OBL_CONSENT_UI", "2026-08-01T00:00:00Z") as { ok: true; value: typeof s }).value;
  s = (satisfyObligation(s, "OBL_D6_GUARDRAILS_UI", "2026-08-01T00:00:00Z") as { ok: true; value: typeof s }).value;

  const r = phaseAdvance(s);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.meta.phase, "B_SOFT_LAUNCH");
});

console.log(`\n${pass} assertions passed`);
