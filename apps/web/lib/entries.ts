// ─── Shared types ────────────────────────────────────────────────────────────
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

// ─── Client-side operations (safe to import in 'use client' files) ────────────

import { createClient } from '@/lib/supabase/client'

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

/** Client-side: fetch today's entry (used inside Client Components) */
export async function fetchTodayEntryClient(): Promise<Entry | null> {
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

/** Client-side: subscribe to a single entry's AI response via Realtime */
export function subscribeToEntryAI(
  entryId: string,
  onUpdate: (ai_response: string) => void,
): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel(`entry-ai-${entryId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'entries',
        filter: `id=eq.${entryId}`,
      },
      (payload) => {
        const ai = (payload.new as Entry).ai_response
        if (ai) onUpdate(ai)
      },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
