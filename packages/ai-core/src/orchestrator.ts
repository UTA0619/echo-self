import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type AITask =
  | 'behavioral-tagging'
  | 'emotion-classification'
  | 'memory-compression'
  | 'pattern-detection'
  | 'future-self-narrative'
  | 'future-self-letter'
  | 'echo-conversation'

export function getModelForTask(task: AITask): { provider: 'anthropic' | 'openai'; model: string } {
  switch (task) {
    case 'future-self-narrative':
      return { provider: 'openai', model: 'gpt-4o' }
    case 'behavioral-tagging':
    case 'emotion-classification':
    case 'memory-compression':
    case 'pattern-detection':
    case 'future-self-letter':
    case 'echo-conversation':
      return { provider: 'anthropic', model: 'claude-sonnet-4-6' }
  }
}
