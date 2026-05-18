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
