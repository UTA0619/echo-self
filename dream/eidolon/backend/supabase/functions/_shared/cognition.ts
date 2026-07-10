// Tier-based cognition model selection (STRATEGY.md §6 — align AI COGS with payers).
//
// Free users run on the cheap model; paid tiers get the high-quality one. This is
// the server-side mirror of SubscriptionTier.cognitionModel (Dart) and the fix for
// the per-user nightly LLM cost that the strategy review flagged: heavy compute is
// spent on the people who pay for the deeper bond.
//
// Pure and dependency-free (tsx-testable). Used by overnight-simulate to pick the
// narrative model per Eidolon's owner.

import type { AiModel, SubscriptionTier } from './types.ts';

/** The model a given subscription tier's narrative/reasoning runs on. */
export function cognitionModelForTier(tier: SubscriptionTier): AiModel {
  switch (tier) {
    case 'soul_pass':
    case 'eternal':
      return 'claude-sonnet-4-5';
    case 'free':
    default:
      return 'claude-haiku-4-5';
  }
}

/** Coerce an unknown/legacy stored value to a valid tier (defaults to free). */
export function tierFromValue(value: unknown): SubscriptionTier {
  return value === 'soul_pass' || value === 'eternal' ? value : 'free';
}
