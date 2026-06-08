/**
 * Prompt builder for identity node extraction.
 * Deno-compatible copy (no Node/package imports) of packages/ai-core/src/prompts/identity-infer.ts
 */

export const IDENTITY_TAXONOMY = [
  'belief',
  'value',
  'core_fear',
  'core_desire',
  'behavioral_pattern',
  'relationship_pattern',
  'strength',
] as const

export type IdentityNodeType = typeof IDENTITY_TAXONOMY[number]

export interface IdentityInferParams {
  content: string
  existingNodes?: Array<{ type: string; label: string }>
  userName?: string
}

export function buildIdentityInferSystemPrompt(): string {
  return `You are an expert behavioral psychologist extracting identity signals from personal journal entries.

Your task is to surface the stable beliefs, values, fears, desires, and patterns that underlie what the person has written — not what they literally say, but what it reveals about who they are.

Rules:
- Only extract nodes with confidence >= 0.6
- Maximum 5 nodes per entry
- Labels must be specific: "fear of being misunderstood" not "fear of others"
- Require either: 2+ mentions, OR strong emotional weight, for confidence > 0.8
- Consider context: journaling is private and candid — trust the authenticity
- NEVER make clinical diagnoses
- Return ONLY a valid JSON array — no markdown, no preamble`
}

export function buildIdentityInferPrompt(params: IdentityInferParams): string {
  const { content, existingNodes, userName } = params

  const existingBlock = existingNodes?.length
    ? `\nAlready-known nodes for ${userName ?? 'this user'} (avoid exact duplicates, but refine if evidence is stronger):\n${existingNodes.map(n => `- [${n.type}] ${n.label}`).join('\n')}`
    : ''

  return `Journal entry to analyze:
---
${content}
---
${existingBlock}

Extract identity nodes. Return a JSON array of objects with exactly these keys:
[
  {
    "type": one of [${IDENTITY_TAXONOMY.join(' | ')}],
    "label": "2-5 word lowercase label",
    "description": "One sentence explaining this identity signal and how it shows in the entry.",
    "polarity": "positive" | "negative" | "neutral",
    "confidence": 0.6–1.0
  }
]

Return an empty array [] if nothing meaningful can be extracted.`
}
