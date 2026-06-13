// Run: npx tsx backend/supabase/functions/_shared/__tests__/consent.test.ts
import assert from 'node:assert/strict';
import {
  consentSet,
  hasConsent,
  filterRealityByConsent,
  socialSignalFor,
  isConsentSignal,
  CONSENT_SIGNALS,
} from '../consent.ts';

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

console.log('consent (D4/D8) tests\n');

t('default DENY: no grants -> empty consent set', () => {
  const s = consentSet(null);
  assert.equal(s.size, 0);
  for (const sig of CONSENT_SIGNALS) assert.equal(hasConsent(s, sig), false);
});

t('only granted:true, known signals count', () => {
  const s = consentSet([
    { signal: 'steps', granted: true },
    { signal: 'sleep', granted: false }, // revoked -> denied
    { signal: 'bogus', granted: true }, // unknown -> ignored
  ]);
  assert.equal(hasConsent(s, 'steps'), true);
  assert.equal(hasConsent(s, 'sleep'), false);
  assert.equal(s.size, 1);
});

t('filterRealityByConsent drops non-consented fields entirely', () => {
  const grants = consentSet([{ signal: 'steps', granted: true }]);
  const out = filterRealityByConsent({ steps: 8000, sleep_hours: 7, hrv: 55 }, grants);
  assert.deepEqual(out, { steps: 8000 }); // sleep + hrv dropped, not zeroed
  assert.equal('sleep_hours' in out, false);
  assert.equal('hrv' in out, false);
});

t('filterRealityByConsent with no consent yields empty object', () => {
  const out = filterRealityByConsent({ steps: 8000, sleep_hours: 7 }, consentSet([]));
  assert.deepEqual(out, {});
});

t('null sync is safe', () => {
  assert.deepEqual(filterRealityByConsent(null, consentSet([])), {});
});

t('consented field that is null stays absent', () => {
  const grants = consentSet([{ signal: 'sleep', granted: true }]);
  const out = filterRealityByConsent({ steps: null, sleep_hours: null }, grants);
  assert.deepEqual(out, {});
});

t('social action -> required signal mapping', () => {
  assert.equal(socialSignalFor('visit'), 'social_visit');
  assert.equal(socialSignalFor('trade'), 'social_trade');
  assert.equal(socialSignalFor('duel'), 'social_duel');
  assert.equal(socialSignalFor('memory_exchange'), 'memory_exchange');
  assert.equal(socialSignalFor('unknown'), null);
});

t('isConsentSignal guards unknown strings', () => {
  assert.equal(isConsentSignal('steps'), true);
  assert.equal(isConsentSignal('telepathy'), false);
});

console.log(`\n${pass} assertions passed`);
