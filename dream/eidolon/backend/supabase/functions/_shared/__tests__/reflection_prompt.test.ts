// Run: npx tsx backend/supabase/functions/_shared/__tests__/reflection_prompt.test.ts
import assert from 'node:assert/strict';
import {
  buildReflectionSystemPrompt,
  buildReflectionFallback,
  sanitizeReflection,
  shouldGenerateReflection,
  type ReflectionParams,
} from '../reflection_prompt.ts';

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

const params = (over: Partial<ReflectionParams> = {}): ReflectionParams => ({
  name: 'Aria',
  openness: 60,
  conscientiousness: 50,
  extraversion: 40,
  agreeableness: 70,
  neuroticism: 30,
  recentMemories: '- talked about a hard day at work\n- slept poorly twice',
  realitySummary: 'sleep dipped midweek; steps steady',
  recentHighlights: '- Aria found a quiet shrine',
  language: 'en',
  ...over,
});

console.log('weekly reflection (Act 2; D5/D7/D2) tests\n');

t('reflection is a paid-only relationship perk', () => {
  assert.equal(shouldGenerateReflection('free'), false);
  assert.equal(shouldGenerateReflection('soul_pass'), true);
  assert.equal(shouldGenerateReflection('eternal'), true);
});

t('prompt grounds in the real data and forbids fabrication (D5)', () => {
  const s = buildReflectionSystemPrompt(params());
  assert.ok(s.includes('talked about a hard day at work'));
  assert.ok(/invent\s+nothing/i.test(s) && /ground/i.test(s));
});

t('prompt enforces non-harm: no guilt/anxiety/streaks/worth (D7)', () => {
  const s = buildReflectionSystemPrompt(params());
  assert.ok(/never induce guilt, anxiety/i.test(s));
  assert.ok(/no streaks/i.test(s));
  assert.ok(/worth/i.test(s));
  assert.ok(/who they "really are"/i.test(s));
});

t('prompt never recites the Big Five numbers to the user', () => {
  const s = buildReflectionSystemPrompt(params());
  assert.ok(/never recite these\s*\n?\s*numbers/i.test(s));
});

t('fallback is safe and non-judgemental (EN + JA)', () => {
  const en = buildReflectionFallback('Aria', 'en');
  assert.ok(en.reflection.includes('Aria'));
  assert.equal(en.nudge, '');
  const ja = buildReflectionFallback('Aria', 'ja');
  assert.ok(ja.reflection.includes('Aria'));
});

t('sanitize fills blanks from fallback and trims', () => {
  const out = sanitizeReflection({ reflection: '  hello  ', observation: '' }, 'Aria', 'en');
  assert.equal(out.reflection, 'hello');
  assert.ok(out.observation.length > 0); // filled from fallback
  assert.equal(out.nudge, '');
});

t('sanitize rejects non-object', () => {
  const out = sanitizeReflection('nope', 'Aria', 'en');
  assert.ok(out.reflection.includes('Aria'));
});

console.log(`\n${pass} assertions passed`);
