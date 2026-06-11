// Client-safe identity types. Keep free of server-only imports
// (next/headers, the server Supabase client) — imported by Client
// Components. Data fetchers live in ./identity-server.

export type IdentityNodeType =
  | 'belief'
  | 'core_fear'
  | 'core_desire'
  | 'value'
  | 'behavioral_pattern'
  | 'relationship_pattern'
  | 'strength'

export interface IdentityNode {
  id: string
  user_id: string
  type: IdentityNodeType
  label: string
  description: string | null
  evidence: string[]
  confidence: number
  polarity: 'positive' | 'negative' | 'neutral'
  active: boolean
  created_at: string
  updated_at: string
}

export interface BehavioralPattern {
  id: string
  user_id: string
  pattern_type: string
  pattern_description: string
  frequency_days: number
  confidence: number
  trigger_tags: string[]
  last_seen_at: string
  is_active: boolean
}
