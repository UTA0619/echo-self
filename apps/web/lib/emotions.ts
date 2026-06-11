// Client-safe emotion constants and types.
// NOTE: keep this module free of server-only imports (next/headers, the
// server Supabase client). It is imported by Client Components such as
// EmotionalTimeline; the data-fetching helper lives in ./emotions-server.

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
