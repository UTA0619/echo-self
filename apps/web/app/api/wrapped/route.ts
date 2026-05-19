import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01T00:00:00.000Z`

  const [entriesRes, emotionsRes, identityRes, patternsRes] = await Promise.all([
    supabase.from('entries').select('created_at, emotion, emotion_score, content').eq('user_id', user.id).gte('created_at', yearStart).order('created_at', { ascending: true }),
    supabase.from('entries').select('emotion, emotion_score').eq('user_id', user.id).gte('created_at', yearStart).not('emotion', 'is', null),
    supabase.from('identity_nodes').select('type, label, confidence').eq('user_id', user.id).eq('active', true).order('confidence', { ascending: false }).limit(5),
    supabase.from('behavioral_patterns').select('pattern_type, pattern_description, confidence').eq('user_id', user.id).eq('is_active', true).order('confidence', { ascending: false }).limit(3),
  ])

  const entries = entriesRes.data ?? []
  const emotions = emotionsRes.data ?? []
  const identityNodes = identityRes.data ?? []
  const patterns = patternsRes.data ?? []

  if (entries.length < 5) {
    return NextResponse.json({ error: 'Not enough entries for a Wrapped. Keep journaling!', entryCount: entries.length }, { status: 422 })
  }

  const emotionCounts: Record<string, number> = {}
  let totalScore = 0
  let scoreCount = 0
  for (const e of emotions) {
    if (e.emotion) emotionCounts[e.emotion] = (emotionCounts[e.emotion] ?? 0) + 1
    if (e.emotion_score != null) { totalScore += e.emotion_score; scoreCount++ }
  }

  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
  const avgEmotionalScore = scoreCount > 0 ? totalScore / scoreCount : 0

  const sampleEntries = entries.filter((_, i) => i % Math.max(1, Math.floor(entries.length / 8)) === 0).slice(0, 8).map(e => e.content.slice(0, 150))

  const prompt = `You are ECHO, summarizing a person's entire year in memory and growth.

## Their ${year} in numbers
- ${entries.length} journal entries written
- Dominant emotion: ${dominantEmotion}
- Average emotional tone: ${avgEmotionalScore > 0 ? 'positive' : avgEmotionalScore < 0 ? 'reflective' : 'balanced'}

## Top identity traits discovered
${identityNodes.map(n => `- ${n.label} (${n.type})`).join('\n')}

## Behavioral patterns detected
${patterns.map(p => `- ${p.pattern_description.slice(0, 100)}`).join('\n')}

## Sample entries from throughout the year
${sampleEntries.map((s, i) => `[Entry ${i + 1}]: "${s}"`).join('\n')}

Write a beautiful, personal "ECHO Wrapped" summary. Return ONLY valid JSON:
{
  "narrative": "3-4 sentence warm poetic arc of their year",
  "wordOfTheYear": "single word",
  "headline": "growth headline like 'The year you learned to trust yourself'",
  "lookingAhead": "one forward-looking sentence"
}`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!aiRes.ok) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })

  const aiData = await aiRes.json()
  const rawText = aiData.content?.[0]?.text ?? ''

  let wrapped: { narrative: string; wordOfTheYear: string; headline: string; lookingAhead: string }
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    wrapped = match ? JSON.parse(match[0]) : { narrative: rawText, wordOfTheYear: '', headline: '', lookingAhead: '' }
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }

  return NextResponse.json({
    year,
    stats: { entryCount: entries.length, dominantEmotion, avgEmotionalScore: Math.round(avgEmotionalScore * 100) / 100, topIdentityTraits: identityNodes.map(n => n.label) },
    ...wrapped,
  })
}
