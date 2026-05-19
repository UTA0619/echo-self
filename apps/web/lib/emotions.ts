import { createClient } from '@/lib/supabase/server'

export interface EmotionPoint {
  date: string
  emotion: string
  score: number
}

export const EMOTION_COLORS: Record<string, string> = {
  joy:          '#F6A26C',
  sadness:      '#6C9EF6',
  anger:        '#F66C6C',
  fear:         '#B46CF6',
  surprise:     '#6CF6C8',
  disgust:      '#8B8FA8',
  anticipation: '#F6D46C',
  trust:        '#6CF6A2',
  optimism:     '#F6C86C',
  love:         '#F66CAE',
  awe:          '#C86CF6',
  neutral:      '#8B8FA8',
}

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
