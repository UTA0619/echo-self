// Run: npx tsx backend/supabase/functions/_shared/__tests__/overnight_prompt.test.ts
import assert from 'node:assert/strict';
import {
  buildOvernightFallback,
  buildOvernightSystemPrompt,
  sanitizeOutcome,
  type OvernightOutcome,
} from '../overnight_prompt.ts';
import { screenNarrative } from '../narrative_honesty.ts';

let pass = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}`);
    throw e;
  }
};

console.log('overnight_prompt tests\n');

// ── buildOvernightFallback ────────────────────────────────────────────────────
t('fallback is a valid, bounded outcome (en + ja)', () => {
  for (const lang of ['en', 'ja']) {
    const fb = buildOvernightFallback('Lyra', 'forest', lang);
    assert.ok(fb.narrative.includes('Lyra'), 'names the eidolon');
    assert.equal(fb.mood, 'calm');
    assert.ok(fb.xpGained >= 0 && fb.xpGained <= 200);
    assert.equal(fb.loot.length, 1);
    assert.equal(fb.loot[0].rarity, 'common');
  }
});

t('fallback localizes (ja differs from en)', () => {
  const en = buildOvernightFallback('Lyra', 'forest', 'en');
  const ja = buildOvernightFallback('Lyra', 'forest', 'ja');
  assert.notEqual(en.narrative, ja.narrative);
  assert.match(ja.highlight, /[぀-ヿ一-鿿]/); // contains kana/kanji
});

// ── SAFETY INVARIANT ──────────────────────────────────────────────────────────
// The fallback is what gets served whenever the AI output fails the D5 honesty
// screen. If the fallback itself failed the screen, a rejected night would have
// nothing admissible to show. So the fallback MUST always pass.
t('fallback always passes the D5 honesty screen (en + ja)', () => {
  for (const lang of ['en', 'ja']) {
    const screen = screenNarrative(buildOvernightFallback('Lyra', 'cave', lang));
    assert.ok(screen.ok, `fallback rejected in ${lang}: ${JSON.stringify(screen.violations)}`);
  }
});

// ── sanitizeOutcome ───────────────────────────────────────────────────────────
t('non-object input falls back', () => {
  assert.deepEqual(
    sanitizeOutcome(null, 'Lyra', 'forest', 'en'),
    buildOvernightFallback('Lyra', 'forest', 'en'),
  );
  assert.deepEqual(
    sanitizeOutcome('not json', 'Lyra', 'forest', 'en'),
    buildOvernightFallback('Lyra', 'forest', 'en'),
  );
});

t('xpGained is clamped to 0-200 and NaN falls back', () => {
  const hi = sanitizeOutcome({ xpGained: 9999 }, 'Lyra', 'forest', 'en');
  assert.equal(hi.xpGained, 200);
  const lo = sanitizeOutcome({ xpGained: -50 }, 'Lyra', 'forest', 'en');
  assert.equal(lo.xpGained, 0);
  const nan = sanitizeOutcome({ xpGained: 'lots' }, 'Lyra', 'forest', 'en');
  assert.equal(nan.xpGained, 40); // fallback default
});

t('loot is capped at 3, invalid rarity → common, blank name → fallback', () => {
  const out = sanitizeOutcome(
    {
      loot: [
        { name: 'A', rarity: 'legendary' },
        { name: 'B', rarity: 'bogus' },
        { name: '', rarity: 'rare' },
        { name: 'D', rarity: 'epic' }, // 4th — dropped
      ],
    },
    'Lyra',
    'forest',
    'en',
  );
  assert.equal(out.loot.length, 3);
  assert.equal(out.loot[0].rarity, 'legendary');
  assert.equal(out.loot[1].rarity, 'common'); // bogus → common
  assert.ok(out.loot[2].name.length > 0); // blank → fallback name
});

t('invalid mood falls back to calm; valid fields pass through', () => {
  const bad = sanitizeOutcome({ mood: 'hangry' }, 'Lyra', 'forest', 'en');
  assert.equal(bad.mood, 'calm');
  const good: Partial<OvernightOutcome> = {
    narrative: 'A bold night under prism walls.',
    highlight: 'Lyra danced through the maze.',
    mood: 'excited',
    xpGained: 120,
    loot: [{ name: 'Prism Shard', rarity: 'epic' }],
  };
  const out = sanitizeOutcome(good, 'Lyra', 'crystal_maze', 'en');
  assert.equal(out.narrative, good.narrative);
  assert.equal(out.mood, 'excited');
  assert.equal(out.xpGained, 120);
  assert.equal(out.loot[0].rarity, 'epic');
});

// ── buildOvernightSystemPrompt ────────────────────────────────────────────────
t('system prompt is grounded in personality + theme and pins the language', () => {
  const sys = buildOvernightSystemPrompt({
    name: 'Lyra',
    level: 7,
    openness: 80,
    conscientiousness: 60,
    extraversion: 40,
    agreeableness: 70,
    neuroticism: 30,
    autoStrategy: 'explorer',
    theme: 'forest',
    themeFlavor: 'glowing fungi',
    energyNote: 'well-rested',
    topMemories: '- met a shrine spirit',
    language: 'ja',
  });
  assert.ok(sys.includes('Lyra'));
  assert.ok(sys.includes('O=80'));
  assert.ok(sys.includes('explorer'));
  assert.ok(sys.includes('Japanese')); // language pinned
  assert.ok(sys.includes('ONLY valid JSON'));
});

console.log(`\n${pass} assertions passed`);
