/**
 * pattern-detect: Analyze a user's last 30 days of behavioral tags
 * to surface recurring behavioral patterns using Claude Sonnet.
 *
 * Triggered by: daily cron after behavioral-tag runs, or manual POST.
 * Input: { user_id }
 * Output: upserts rows into behavioral_patterns table
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-sonnet-4-6'

interface TagOccurrence {
  tag: string
  count: number
  dates: string[]
  sample_contents: string[]
}

interface DetectedPattern {
  pattern_type: string
  pattern_description: string
  frequency_days: number
  confidence: number
  trigger_tags: string[]
  evidence_entry_ids: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const { user_id } = await req.json()
    if (!user_id) return errorResponse('user_id required', 400)

    const supabase = getServiceClient()
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

    // Fetch entries with tags from last 30 days
    const { data: entries, error: entriesErr } = await supabase
      .from('entries')
      .select('id, content, created_at, tags, emotion, emotion_score')
      .eq('user_id', user_id)
      .gte('created_at', since)
      .not('tags', 'is', null)
      .order('created_at', { ascending: false })

    if (entriesErr) return errorResponse(entriesErr.message, 500)
    if (!entries || entries.length < 3) {
      return jsonResponse({ patterns: [], message: 'Not enough data for pattern detection' })
    }

    // Aggregate tag occurrences
    const tagMap: Map<string, TagOccurrence> = new Map()

    for (const entry of entries) {
      const tags: string[] = entry.tags ?? []
      const date = entry.created_at.split('T')[0]!

      for (const tag of tags) {
        const existing = tagMap.get(tag) ?? { tag, count: 0, dates: [], sample_contents: [] }
        existing.count++
        if (!existing.dates.includes(date)) existing.dates.push(date)
        if (existing.sample_contents.length < 3) {
          existing.sample_contents.push(entry.content.slice(0, 200))
        }
        tagMap.set(tag, existing)
      }
    }

    // Only tags appearing 3+ times are worth analyzing
    const significantTags = Array.from(tagMap.values())
      .filter(t => t.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    if (significantTags.length === 0) {
      return jsonResponse({ patterns: [], message: 'No significant tag frequency yet' })
    }

    // Build a summary of entries for Claude
    const entryDigest = entries.slice(0, 30).map(e => ({
      id: e.id,
      date: e.created_at.split('T')[0],
      tags: e.tags ?? [],
      emotion: e.emotion,
      snippet: e.content.slice(0, 150),
    }))

    const prompt = `You are analyzing a person's journaling data to identify meaningful behavioral patterns.

## Recurring Tags (last 30 days)
${significantTags.map(t => `- "${t.tag}" appeared ${t.count}x across ${t.dates.length} days`).join('\n')}

## Recent Entry Samples (newest first)
${entryDigest.map(e => `[${e.date}] tags: [${e.tags.join(', ')}] | emotion: ${e.emotion ?? 'unknown'} | "${e.snippet}"`).join('\n')}

## Task
Identify 2-4 specific, actionable behavioral patterns this person demonstrates. Each pattern must:
1. Be grounded in the tag data (not generic advice)
2. Reference specific tag combinations or temporal patterns
3. Be stated in 2nd person, empathetically ("You tend to..." / "When you...")
4. Include which tags drive this pattern

Return ONLY valid JSON:
{
  "patterns": [
    {
      "pattern_type": "cognitive|emotional|relational|energy|temporal",
      "pattern_description": "2-3 sentence empathetic description of the pattern",
      "frequency_days": <estimated days between recurrence, 1-30>,
      "confidence": <0.6-0.95>,
      "trigger_tags": ["tag1", "tag2"]
    }
  ]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return errorResponse(`Claude error: ${err}`, 502)
    }

    const aiResult = await response.json()
    const rawText = aiResult.content?.[0]?.text ?? ''

    let detected: { patterns: DetectedPattern[] }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      detected = jsonMatch ? JSON.parse(jsonMatch[0]) : { patterns: [] }
    } catch {
      return errorResponse('Failed to parse Claude pattern response', 500)
    }

    // Find entry IDs relevant to each pattern's trigger tags
    for (const pattern of detected.patterns) {
      const triggerTags = pattern.trigger_tags ?? []
      pattern.evidence_entry_ids = entries
        .filter(e => (e.tags ?? []).some((t: string) => triggerTags.includes(t)))
        .map(e => e.id)
        .slice(0, 10)
    }

    // Upsert patterns (match on user_id + pattern_type + first 100 chars of description)
    const now = new Date().toISOString()
    const upsertResults = []

    for (const pattern of detected.patterns) {
      // Check if a similar pattern already exists
      const { data: existing } = await supabase
        .from('behavioral_patterns')
        .select('id, confidence, frequency_days')
        .eq('user_id', user_id)
        .eq('pattern_type', pattern.pattern_type)
        .eq('is_active', true)
        .ilike('pattern_description', `${pattern.pattern_description.slice(0, 50)}%`)
        .maybeSingle()

      if (existing) {
        // Update confidence and last_seen
        const { error } = await supabase
          .from('behavioral_patterns')
          .update({
            confidence: Math.min(0.98, (existing.confidence + pattern.confidence) / 2 + 0.05),
            frequency_days: Math.round((existing.frequency_days + pattern.frequency_days) / 2),
            last_seen_at: now,
            evidence_entry_ids: pattern.evidence_entry_ids,
          })
          .eq('id', existing.id)

        upsertResults.push({ id: existing.id, action: 'updated', error: error?.message })
      } else {
        const { data: inserted, error } = await supabase
          .from('behavioral_patterns')
          .insert({
            user_id,
            pattern_type: pattern.pattern_type,
            pattern_description: pattern.pattern_description,
            frequency_days: pattern.frequency_days,
            confidence: pattern.confidence,
            trigger_tags: pattern.trigger_tags,
            evidence_entry_ids: pattern.evidence_entry_ids,
            first_detected_at: now,
            last_seen_at: now,
            is_active: true,
          })
          .select('id')
          .single()

        upsertResults.push({ id: inserted?.id, action: 'inserted', error: error?.message })
      }
    }

    return jsonResponse({ patterns: detected.patterns, results: upsertResults })
  } catch (err) {
    return errorResponse(String(err), 500)
  }
})
