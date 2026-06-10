// Server-only identity data access. Uses the server Supabase client
// (next/headers cookies) — never import from a Client Component.
import { createClient } from '@/lib/supabase/server'
import type { IdentityNode, BehavioralPattern } from '@/lib/identity'

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
