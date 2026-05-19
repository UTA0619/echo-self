import { createClient } from '@/lib/supabase/client'

export interface Entry {
  id: string
  user_id: string
  content: string
  voice_url: string | null
  emotion: string | null
  emotion_score: number | null
  emotion_data: Record<string, unknown> | null
  tags: string[]
  ai_response: string | null
  echo_rating: -1 | 1 | null
  word_count: number
  created_at: string
  updated_at: string
}

export async function fetchEntries(limit = 20): Promise<Entry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function fetchTodayEntry(): Promise<Entry | null> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getInternalUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  return data?.id ?? null
}

export async function insertEntry(content: string, userId: string): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({ user_id: userId, content })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rateEntry(entryId: string, rating: -1 | 1): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('entries')
    .update({ echo_rating: rating })
    .eq('id', entryId)

  if (error) throw error
}
