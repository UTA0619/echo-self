// Server-only emotion data access. Uses the server Supabase client
// (next/headers cookies) — never import this from a Client Component.
import { createClient } from '@/lib/supabase/server'
import type { EmotionPoint } from '@/lib/emotions'

export async function fetchEmotionHistory(days = 30): Promise<EmotionPoint[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('entries')
    .select('created_at, emotion, emotion_score')
    .not('emotion', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw error

  return (data ?? [])
    .filter(r => r.emotion && r.emotion_score != null)
    .map(r => ({
      date: r.created_at.split('T')[0]!,
      emotion: r.emotion!,
      score: r.emotion_score!,
    }))
}
