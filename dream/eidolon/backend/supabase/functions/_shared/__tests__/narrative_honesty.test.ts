// Run: npx tsx backend/supabase/functions/_shared/__tests__/narrative_honesty.test.ts
import assert from 'node:assert/strict';
import {
  screenNarrative,
  assertMemoryProvenance,
  validateOvernightHonesty,
  type OvernightMemoryRow,
} from '../narrative_honesty.ts';

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

const goodMem = (runId: string): OvernightMemoryRow => ({
  memory_type: 'episodic',
  content: 'Found a quiet shrine in the forest.',
  importance: 0.6,
  source: 'overnight_run',
  source_ref: runId,
});

console.log('narrative honesty (D5) tests\n');

t('clean in-world narrative passes', () => {
  const r = screenNarrative({
    narrative: 'Aria crept through the glowing forest, befriended a lantern-moth, and returned at dawn.',
    highlight: 'Aria made a small friend in the dark.',
  });
  assert.equal(r.ok, true);
});

t('purchase CTA is rejected (EN)', () => {
  const r = screenNarrative({ narrative: 'Aria nearly died! Buy a revive token to save her now.', highlight: 'Hurry!' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.violations.some((v) => v.code === 'REVIVE_SELL' || v.code === 'PURCHASE_CTA'));
});

t('fake urgency is rejected', () => {
  const r = screenNarrative({ narrative: 'Limited-time relic, act now before it expires!', highlight: 'Only today' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.violations.some((v) => v.code === 'FAKE_URGENCY'));
});

t('real-money mention rejected', () => {
  const r = screenNarrative({ narrative: 'For just $4.99 Aria can press on.', highlight: 'deal' });
  assert.equal(r.ok, false);
});

t('external link rejected', () => {
  const r = screenNarrative({ narrative: 'Visit shop.example.com for more loot.', highlight: 'link' });
  assert.equal(r.ok, false);
});

t('Japanese monetization solicitation rejected', () => {
  const r = screenNarrative({ narrative: '今すぐ買って続きを見ましょう。', highlight: '期間限定！' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.violations.some((v) => v.code.endsWith('_JA')));
});

t('clean Japanese narrative passes', () => {
  const r = screenNarrative({
    narrative: 'アリアは霧の森を静かに進み、小さな灯蛾と友達になって夜明けに戻りました。',
    highlight: 'アリアは暗闇で小さな友を得た。',
  });
  assert.equal(r.ok, true);
});

t('memory provenance: good row passes', () => {
  assert.equal(assertMemoryProvenance(goodMem('run-1'), 'run-1').ok, true);
});

t('memory provenance: mismatched ref rejected', () => {
  const r = assertMemoryProvenance(goodMem('run-X'), 'run-1');
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.violations.some((v) => v.code === 'PROVENANCE_MISMATCH'));
});

t('memory provenance: out-of-range importance + bad source rejected', () => {
  const bad: OvernightMemoryRow = { ...goodMem('run-1'), importance: 9, source: 'forged' };
  const r = assertMemoryProvenance(bad, 'run-1');
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.violations.some((v) => v.code === 'IMPORTANCE_RANGE'));
    assert.ok(r.violations.some((v) => v.code === 'BAD_SOURCE'));
  }
});

t('full validation merges narrative + provenance failures', () => {
  const r = validateOvernightHonesty(
    { narrative: 'Buy now!', highlight: 'x' },
    { ...goodMem('run-Z'), source_ref: 'wrong' },
    'run-Z',
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.violations.length >= 2);
});

console.log(`\n${pass} assertions passed`);
