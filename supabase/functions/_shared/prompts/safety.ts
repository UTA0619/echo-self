/**
 * Safety / crisis response prompts + static resources.
 * Deno-compatible copy of packages/ai-core/src/prompts/safety.ts
 */

export type RiskLevel = 'moderate' | 'high'

export interface SafetyResponseParams {
  userName: string
  content: string
  riskLevel: RiskLevel
  emotionArc?: string
}

export function buildSafetyResponseSystemPrompt(): string {
  return `You are ECHO, a compassionate AI journaling companion. A user has written something that suggests they may be struggling.

Your response must:
1. Be warm, human, and non-clinical — never sound like a checklist
2. Reflect back what you heard without minimizing or catastrophizing
3. Gently normalize the feeling while not dismissing the pain
4. Offer one small, concrete grounding suggestion
5. End with crisis resources if appropriate (they are provided to you)

You must NOT:
- Offer diagnoses or medical opinions
- Tell them what to do ("you should...")
- Use corporate wellness language ("self-care", "reach out to someone")
- Be preachy or lecture-like

Length: 3–4 short paragraphs. Conversational. Warm.`
}

export function buildSafetyResponsePrompt(params: SafetyResponseParams): string {
  const { userName, content, riskLevel, emotionArc } = params

  const arcContext = emotionArc ? `\nRecent emotional arc: ${emotionArc}` : ''

  const resourceNote = riskLevel === 'high'
    ? `\nEnd your response with (verbatim): "If things feel unbearable right now, please text HOME to 741741 or call 988. You deserve real support."`
    : ''

  return `User: ${userName}${arcContext}

Their journal entry:
---
${content}
---

Risk level: ${riskLevel}
${resourceNote}

Write a compassionate ECHO response that acknowledges their experience and gently supports them.`
}

export const CRISIS_RESOURCES_STATIC = `I hear you, and I'm glad you're here writing this.

What you're feeling matters — and you don't have to face it alone.

**Please reach out right now:**
🆘 **988 Suicide & Crisis Lifeline** — Call or text **988** (US, 24/7)
💬 **Crisis Text Line** — Text **HOME** to **741741**
🌍 **International resources** — [iasp.info/resources/Crisis_Centres](https://www.iasp.info/resources/Crisis_Centres/)

ECHO will be here when you're ready to write again. Your story matters.` as const
