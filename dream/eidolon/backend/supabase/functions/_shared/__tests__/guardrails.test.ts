// Run: npx tsx backend/supabase/functions/_shared/__tests__/guardrails.test.ts
import assert from 'node:assert/strict';
import {
  clampGuardrails,
  DEFAULT_GUARDRAILS,
  evaluateAction,
  isPermitted,
  requiresWakingConsent,
  selectThemeWithinGuardrails,
  THEME_DANGER,
  type AutonomousAction,
} from '../guardrails.ts';

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

const THEMES = Object.keys(THEME_DANGER);

console.log('guardrails (D6) tests\n');

t('absent config yields conservative defaults', () => {
  assert.deepEqual(clampGuardrails(null), DEFAULT_GUARDRAILS);
  assert.deepEqual(clampGuardrails(undefined), DEFAULT_GUARDRAILS);
});

t('clamps out-of-range and rejects unknown strategy', () => {
  const g = clampGuardrails({ riskTolerance: 999, openness: -5, socialOpenness: 50.7, autoStrategy: 'reckless' });
  assert.equal(g.riskTolerance, 100);
  assert.equal(g.openness, 0);
  assert.equal(g.socialOpenness, 51);
  assert.equal(g.autoStrategy, 'balanced'); // unknown -> default
});

t('currency-spending action is refused and needs waking consent', () => {
  const a: AutonomousAction = { type: 'buy_revive', reversible: true, costsCurrency: true };
  const d = evaluateAction(a, DEFAULT_GUARDRAILS);
  assert.equal(d.allowed, false);
  assert.equal(requiresWakingConsent(a), true);
  if (!d.allowed) assert.equal(d.requiresWakingConsent, true);
});

t('irreversible action is refused and needs waking consent (forbidden corner)', () => {
  const a: AutonomousAction = { type: 'permanent_trade', reversible: false, costsCurrency: false };
  const d = evaluateAction(a, { ...DEFAULT_GUARDRAILS, riskTolerance: 100, socialOpenness: 100 });
  assert.equal(d.allowed, false);
  assert.equal(requiresWakingConsent(a), true);
});

t('reversible, free, in-tolerance action is permitted', () => {
  const a: AutonomousAction = { type: 'explore_room', reversible: true, costsCurrency: false, danger: 30 };
  assert.equal(isPermitted(a, { ...DEFAULT_GUARDRAILS, riskTolerance: 50 }), true);
});

t('danger above risk tolerance is refused (no waking consent — just declined)', () => {
  const a: AutonomousAction = { type: 'dive', reversible: true, costsCurrency: false, danger: 90 };
  const d = evaluateAction(a, { ...DEFAULT_GUARDRAILS, riskTolerance: 40 });
  assert.equal(d.allowed, false);
  if (!d.allowed) assert.equal(d.requiresWakingConsent, false);
});

t('social action refused below social-openness threshold', () => {
  const a: AutonomousAction = { type: 'visit', reversible: true, costsCurrency: false, social: true };
  assert.equal(isPermitted(a, { ...DEFAULT_GUARDRAILS, socialOpenness: 20 }), false);
  assert.equal(isPermitted(a, { ...DEFAULT_GUARDRAILS, socialOpenness: 80 }), true);
});

t('theme selection NEVER exceeds risk tolerance (property, 2000 draws)', () => {
  let seed = 12345;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const rt of [0, 10, 40, 70, 100]) {
    const g = { ...DEFAULT_GUARDRAILS, riskTolerance: rt };
    for (let i = 0; i < 2000; i++) {
      const theme = selectThemeWithinGuardrails(THEMES, g, rng);
      // floor guarantee: at rt below the safest theme, the single safest is allowed
      const safest = Math.min(...THEMES.map((x) => THEME_DANGER[x]));
      const cap = Math.max(rt, safest);
      assert.ok(THEME_DANGER[theme] <= cap, `theme ${theme}(${THEME_DANGER[theme]}) > cap ${cap} at rt=${rt}`);
    }
  }
});

t('low openness hugs the safest themes; high openness ranges wider', () => {
  let s1 = 7;
  const rng1 = () => ((s1 = (s1 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let s2 = 7;
  const rng2 = () => ((s2 = (s2 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const g = { ...DEFAULT_GUARDRAILS, riskTolerance: 100 };
  const avg = (open: number, rng: () => number) => {
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) sum += THEME_DANGER[selectThemeWithinGuardrails(THEMES, { ...g, openness: open }, rng)];
    return sum / n;
  };
  const low = avg(5, rng1);
  const high = avg(95, rng2);
  assert.ok(high > low, `expected high-openness avg danger (${high.toFixed(1)}) > low (${low.toFixed(1)})`);
});

console.log(`\n${pass} assertions passed`);
