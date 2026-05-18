import { anthropic } from '../orchestrator'
import { loadPrompt } from '../prompts/loader'

export async function compressMemoriesToSummary(
  entries: { content: string; memoryDate: string }[],
  userName: string,
  periodType: 'day' | 'week' | 'month'
): Promise<string> {
  const prompt = loadPrompt('memory-compression', { userName, periodType })
  const entriesText = entries
    .map((e) => `[${e.memoryDate}] ${e.content}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: prompt.system,
    messages: [{ role: 'user', content: `${prompt.userPrefix}\n\n${entriesText}` }],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
