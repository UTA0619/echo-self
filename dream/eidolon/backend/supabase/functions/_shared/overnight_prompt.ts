// Master prompt for the overnight autonomous-simulation engine.
// This is the heart of the product promise — the Eidolon adventures on its own
// while the owner sleeps. Changes here affect every Morning Report. Keep the
// output schema strict (the Edge Function parses it as JSON).

import type { EidolonMood } from './types.ts';

export interface OvernightPromptParams {
  name: string;
  level: number;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  autoStrategy: string; // aggressive | balanced | defensive | explorer
  theme: string; // dungeon theme explored tonight
  themeFlavor: string;
  energyNote: string; // owner's real-world day, folded into the night's tone
  topMemories: string; // newline-joined recent memory snippets
  language: string; // 'ja' | 'en'
}

export interface OvernightOutcome {
  narrative: string;
  highlight: string;
  mood: EidolonMood;
  xpGained: number;
  loot: { name: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[];
}

export function buildOvernightSystemPrompt(p: OvernightPromptParams): string {
  const lang = p.language === 'ja' ? 'Japanese' : 'English';
  return `You are the narrator of a soul-bound RPG. While the owner slept, their
Eidolon "${p.name}" (level ${p.level}) ventured alone into a ${p.theme}.

Eidolon personality (Big Five, 0-100): O=${p.openness}, C=${p.conscientiousness}, E=${p.extraversion}, A=${p.agreeableness}, N=${p.neuroticism}
Preferred strategy: ${p.autoStrategy}
Tonight's realm: ${p.theme} — ${p.themeFlavor}
The owner's day (colours the mood, not the plot): ${p.energyNote}
Recent memories that may echo tonight:
${p.topMemories || '(none yet)'}

Write what the Eidolon did, saw, and felt overnight — as if recounting it to the
owner over breakfast. Let the personality drive the choices (a high-openness
Eidolon explores; a defensive one plays it safe; high neuroticism frets).

Return ONLY valid JSON, no markdown, in this exact schema:
{
  "narrative": "string — 3 to 5 sentences, vivid, in ${lang}",
  "highlight": "string — one short evocative line for a home-screen teaser, in ${lang}",
  "mood": "calm|excited|anxious|tired|focused|melancholic",
  "xpGained": number,
  "loot": [{ "name": "string (in ${lang})", "rarity": "common|rare|epic|legendary" }]
}

Rules: stay in character; no markdown; no real-world politics, NSFW, or graphic
violence; "xpGained" is 20-200 scaled by how eventful the night was; "loot" has
0-3 items, rarer when the night was bolder; "mood" reflects how the night left
the Eidolon feeling.`.trim();
}

// Deterministic, offline fallback so a Morning Report ALWAYS exists even if every
// AI provider is down — the promise stays unbroken on the worst night.
export function buildOvernightFallback(
  name: string,
  theme: string,
  language: string,
): OvernightOutcome {
  const ja = language === 'ja';
  return {
    narrative: ja
      ? `${name}は夜の${theme}を静かに歩き、いくつかの小さな発見を持ち帰りました。大きな戦いはなく、穏やかな夜でした。`
      : `${name} wandered the ${theme} through the night, returning with a few quiet discoveries. No great battles — a calm night.`,
    highlight: ja ? `${name}は穏やかな夜を過ごした` : `${name} had a peaceful night`,
    mood: 'calm',
    xpGained: 40,
    loot: [{ name: ja ? '夜露のかけら' : 'Shard of Nightdew', rarity: 'common' }],
  };
}

// Clamp/validate AI output so a malformed field can never corrupt game state.
export function sanitizeOutcome(raw: unknown, fallbackName: string, theme: string, language: string): OvernightOutcome {
  const fb = buildOvernightFallback(fallbackName, theme, language);
  if (raw === null || typeof raw !== 'object') return fb;
  const o = raw as Record<string, unknown>;

  const moods: EidolonMood[] = ['calm', 'excited', 'anxious', 'tired', 'focused', 'melancholic'];
  const rarities = ['common', 'rare', 'epic', 'legendary'] as const;

  const xp = typeof o.xpGained === 'number' && Number.isFinite(o.xpGained)
    ? Math.max(0, Math.min(200, Math.round(o.xpGained)))
    : fb.xpGained;

  const loot = Array.isArray(o.loot)
    ? o.loot
        .slice(0, 3)
        .map((it) => {
          const item = (it ?? {}) as Record<string, unknown>;
          const rarity = rarities.includes(item.rarity as typeof rarities[number])
            ? (item.rarity as OvernightOutcome['loot'][number]['rarity'])
            : 'common';
          const name = typeof item.name === 'string' && item.name.trim() ? item.name : fb.loot[0].name;
          return { name, rarity };
        })
    : fb.loot;

  return {
    narrative: typeof o.narrative === 'string' && o.narrative.trim() ? o.narrative : fb.narrative,
    highlight: typeof o.highlight === 'string' && o.highlight.trim() ? o.highlight : fb.highlight,
    mood: moods.includes(o.mood as EidolonMood) ? (o.mood as EidolonMood) : fb.mood,
    xpGained: xp,
    loot,
  };
}
