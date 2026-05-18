import { openai, anthropic } from '../orchestrator'
import type { IdentitySnapshot, HorizonMonths } from '@echo/shared'

interface SimulationInput {
  userName: string
  horizon: HorizonMonths
  identitySnapshot: IdentitySnapshot
  recentSummaries: string[]
  dominantBehaviors: string[]
}

export async function generateFutureSelfNarrative(input: SimulationInput): Promise<string> {
  const systemPrompt = `You are a compassionate narrator writing about someone's potential future.
Base your narrative ONLY on the provided data — do not invent facts.
Write in second person ("You will..."). Be specific, warm, and honest.
Horizon: ${input.horizon} months from now.`

  const userPrompt = `
Name: ${input.userName}
Current identity traits: ${input.identitySnapshot.traits.map((t) => `${t.traitName} (${Math.round(t.confidence * 100)}% confidence)`).join(', ')}
Recent patterns: ${input.dominantBehaviors.join(', ')}
Recent life summary: ${input.recentSummaries.slice(-3).join(' ')}

Write a 250-300 word narrative of their probable life ${input.horizon} months from now.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function generateFutureSelfLetter(
  userName: string,
  narrative: string,
  horizon: HorizonMonths
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You write deeply personal letters from a person's future self.
The letter must feel like it comes from someone who loves the recipient completely and knows them intimately.
It is warm, specific, honest — never generic. Reference the provided narrative as the basis.
Write in first person as the future self ("I remember when you...").`,
    messages: [
      {
        role: 'user',
        content: `Write a heartfelt letter from ${userName}'s future self (${horizon} months from now) to their present self.
Base it on this narrative of their future: ${narrative}
The letter should be 200-250 words.`,
      },
    ],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
