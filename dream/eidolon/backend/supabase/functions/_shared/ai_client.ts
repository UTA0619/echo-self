import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3';
import type { AiModel } from './types.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

// Fallback chain: Claude → GPT-4o-mini → local template
export type GenerateOptions = {
  system: string;
  user: string;
  model?: AiModel;
  maxTokens?: number;
  // Prior conversation turns for multi-turn continuity. When present, they are
  // sent before `user` (the new turn) so the model has real context.
  history?: ChatTurn[];
};

export type GenerateResult = {
  text: string;
  modelUsed: AiModel;
  latencyMs: number;
};

export async function generateWithFallback(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const start = Date.now();
  const model = opts.model ?? 'claude-haiku-4-5';

  // Attempt 1: Claude
  try {
    const response = await anthropic.messages.create({
      model:
        model === 'claude-sonnet-4-5'
          ? 'claude-sonnet-4-5'
          : 'claude-haiku-4-5-20251001',
      max_tokens: opts.maxTokens ?? 512,
      system: opts.system,
      messages: [
        ...(opts.history ?? []),
        { role: 'user', content: opts.user },
      ],
    });
    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return { text, modelUsed: model, latencyMs: Date.now() - start };
  } catch (claudeErr) {
    console.warn('[ai_client] Claude failed, falling back to GPT-4o-mini:', claudeErr);
  }

  // Attempt 2: GPT-4o-mini via OpenAI
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: opts.maxTokens ?? 512,
          messages: [
            { role: 'system', content: opts.system },
            ...(opts.history ?? []),
            { role: 'user', content: opts.user },
          ],
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return { text, modelUsed: 'gpt-4o-mini', latencyMs: Date.now() - start };
    }
  } catch (openaiErr) {
    console.warn('[ai_client] GPT-4o-mini failed, using local template:', openaiErr);
  }

  // Attempt 3: local static template
  return {
    text: buildLocalFallback(opts.user),
    modelUsed: 'local',
    latencyMs: Date.now() - start,
  };
}

function buildLocalFallback(trigger: string): string {
  const templates = [
    'I sense the path ahead holds both danger and wonder. Let us press forward.',
    'This moment shall be etched into my memory. I am ready.',
    'The dungeon calls. My soul stirs with anticipation.',
    'I have faced trials before. This too shall pass.',
  ];
  const idx = Math.abs(hashCode(trigger)) % templates.length;
  return templates[idx];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
