import { createClient } from '@/lib/supabase/server'

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

export async function fetchIdentityNodes(): Promise<IdentityNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('identity_nodes')
    .select('*')
    .eq('active', true)
    .order('confidence', { ascending: false })
    .limit(40)

  if (error) throw error
  return data ?? []
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

export async function fetchBehavioralPatterns(): Promise<BehavioralPattern[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('behavioral_patterns')
    .select('*')
    .eq('is_active', true)
    .order('confidence', { ascending: false })
    .limit(10)

  if (error) return []
  return data ?? []
}
