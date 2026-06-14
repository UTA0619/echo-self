// Run: npx tsx backend/supabase/functions/_shared/__tests__/cognition.test.ts
import assert from 'node:assert/strict';
import { cognitionModelForTier, tierFromValue } from '../cognition.ts';

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

console.log('cognition (tier→model, STRATEGY §6) tests\n');

t('free runs on the cheap model (COGS spent on payers)', () => {
  assert.equal(cognitionModelForTier('free'), 'claude-haiku-4-5');
});

t('paid tiers get the high-quality model', () => {
  assert.equal(cognitionModelForTier('soul_pass'), 'claude-sonnet-4-5');
  assert.equal(cognitionModelForTier('eternal'), 'claude-sonnet-4-5');
});

t('tierFromValue coerces unknown/legacy to free (default DENY of premium cost)', () => {
  assert.equal(tierFromValue('soul_pass'), 'soul_pass');
  assert.equal(tierFromValue('eternal'), 'eternal');
  assert.equal(tierFromValue('mystery'), 'free');
  assert.equal(tierFromValue(null), 'free');
  assert.equal(tierFromValue(undefined), 'free');
});

t('an unknown tier never accidentally buys the expensive model', () => {
  assert.equal(cognitionModelForTier(tierFromValue('garbage')), 'claude-haiku-4-5');
});

console.log(`\n${pass} assertions passed`);
