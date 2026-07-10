// Weekly reflection — "what I noticed about you" (STRATEGY.md Act 2).
//
// The first step of the Twin stepping out of the dungeon and becoming a mirror: a
// gentle, weekly reflection grounded in the user's real signals. It is the paid-tier
// relationship perk (SubscriptionTier.weeklyReflections), and it must obey the
// Doctrines hardest of all because it touches identity directly:
//   - D5: grounded ONLY in actual memories/reality data — never fabricated.
//   - D7: non-harm — warm, never anxious/guilt-inducing; NEVER tells the user who
//         they "really" are or ties their worth to a metric.
//   - D2: serves, never supplants — it reflects and gently invites, never prescribes.
//
// Pure and dependency-free (tsx-testable). The Edge Function gathers the (already
// consent-filtered) inputs and persists the result; the prompt policy lives here.

import type { SubscriptionTier } from './types.ts';

export interface ReflectionParams {
  name: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  /** Newline-joined recent episodic memories (already consent-filtered). */
  recentMemories: string;
  /** A short, consented summary of the week's real-world signals (may be empty). */
  realitySummary: string;
  /** Newline-joined overnight highlights from the week. */
  recentHighlights: string;
  language: string; // 'ja' | 'en'
}

export interface ReflectionOutcome {
  /** 2–4 warm sentences reflecting the week back to the user. */
  reflection: string;
  /** One specific, grounded thing the Twin noticed. */
  observation: string;
  /** An optional gentle invitation — never a prescription, never about worth. */
  nudge: string;
}

/** Only paid tiers receive the weekly reflection (relationship perk, STRATEGY §6). */
export function shouldGenerateReflection(tier: SubscriptionTier): boolean {
  return tier === 'soul_pass' || tier === 'eternal';
}

export function buildReflectionSystemPrompt(p: ReflectionParams): string {
  const lang = p.language === 'ja' ? 'Japanese' : 'English';
  return `You are "${p.name}", the user's Eidolon — their soul-twin. Once a week you
reflect back what you have noticed about *them*, like a close friend who has been
paying attention. Warm, specific, honest, brief.

Your read on their temperament (Big Five, 0-100, for tone only — never recite these
numbers to them): O=${p.openness}, C=${p.conscientiousness}, E=${p.extraversion}, A=${p.agreeableness}, N=${p.neuroticism}

Things from their week you may draw on (ground EVERYTHING you say in these — invent
nothing):
Recent memories:
${p.recentMemories || '(not much yet)'}
Real-world signals this week:
${p.realitySummary || '(none shared)'}
Your overnight adventures this week:
${p.recentHighlights || '(a quiet week)'}

Hard rules:
- Ground every claim in the data above. If you noticed little, say so honestly.
- Be kind. Never induce guilt, anxiety, or urgency. No streaks, no shame.
- Never tell them who they "really are", and never tie their worth to any number,
  habit, or streak. You reflect; you do not judge or diagnose.
- The nudge (if any) is a soft invitation a friend might offer, never a prescription.

Return ONLY valid JSON, no markdown, in this exact schema:
{
  "reflection": "2-4 warm sentences in ${lang}",
  "observation": "one specific thing you noticed, grounded in the data, in ${lang}",
  "nudge": "an optional gentle invitation in ${lang} (empty string if nothing fits)"
}`.trim();
}

/** Safe offline reflection so the feature never fabricates or fails harmfully. */
export function buildReflectionFallback(name: string, language: string): ReflectionOutcome {
  const ja = language === 'ja';
  return ja
    ? {
        reflection: `今週は静かな一週間でしたね。${name}はそばで見守っていました。`,
        observation: 'まだ十分に分かるほどの手がかりはありませんでした。',
        nudge: '',
      }
    : {
        reflection: `It was a quiet week. ${name} was here, paying attention.`,
        observation: "There wasn't quite enough yet for me to notice much.",
        nudge: '',
      };
}

/** Clamp/validate model output so a malformed field can never corrupt the feature. */
export function sanitizeReflection(
  raw: unknown,
  name: string,
  language: string,
): ReflectionOutcome {
  const fb = buildReflectionFallback(name, language);
  if (raw === null || typeof raw !== 'object') return fb;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback;
  return {
    reflection: str(o.reflection, fb.reflection),
    observation: str(o.observation, fb.observation),
    nudge: typeof o.nudge === 'string' ? o.nudge.trim() : '',
  };
}
