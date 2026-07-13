// ECHO//SELF — Demo reflection engine
// A fully local, backend-free stand-in for the production AI pipeline.
// Lets the product loop (write → emotion → ECHO reflection → identity growth →
// future self) run with zero Supabase / Anthropic / OpenAI keys.
//
// Nothing here is meant to match the real models' quality — it exists so a
// founder (or beta tester) can FEEL the core loop end-to-end and review it.

import type { Entry } from '@/lib/entries'
import type { IdentityNode, BehavioralPattern } from '@/lib/identity'
import type { EmotionPoint } from '@/lib/emotions'

// ─── Emotion classification (lexicon-based) ───────────────────────────────────

const EMOTION_LEXICON: Record<string, string[]> = {
  joy: ['happy', 'joy', 'glad', 'excited', 'grateful', 'love', 'wonderful', 'great', 'amazing', 'proud', 'celebrate', 'win', 'won', 'delighted', 'thrilled', 'good'],
  sadness: ['sad', 'down', 'lonely', 'empty', 'cry', 'tears', 'lost', 'grief', 'miss', 'hopeless', 'depressed', 'low', 'tired of', 'numb'],
  anger: ['angry', 'mad', 'furious', 'frustrated', 'annoyed', 'irritated', 'rage', 'unfair', 'hate', 'resent', 'pissed'],
  fear: ['afraid', 'scared', 'anxious', 'worried', 'nervous', 'panic', 'fear', 'dread', 'overwhelmed', 'stress', 'stressed', 'uncertain', 'doubt'],
  surprise: ['surprised', 'shocked', 'unexpected', 'suddenly', 'wow', 'cannot believe', "can't believe", 'astonished'],
  anticipation: ['hope', 'looking forward', 'excited for', 'plan', 'soon', 'will', 'going to', 'tomorrow', 'next', 'goal', 'dream'],
  trust: ['trust', 'safe', 'support', 'reliable', 'depend', 'believe in', 'faith', 'connected', 'understood'],
  love: ['love', 'adore', 'cherish', 'partner', 'family', 'friend', 'care', 'affection', 'close'],
}

export interface EmotionResult {
  emotion: string
  score: number // 0..1 intensity
}

export function classifyEmotion(text: string): EmotionResult {
  const lower = text.toLowerCase()
  const scores: Record<string, number> = {}

  for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
    let hits = 0
    for (const w of words) if (lower.includes(w)) hits++
    if (hits > 0) scores[emotion] = hits
  }

  const entries = Object.entries(scores)
  if (entries.length === 0) return { emotion: 'neutral', score: 0.4 }

  entries.sort((a, b) => b[1] - a[1])
  const [emotion, hits] = entries[0]!
  // More keyword hits + longer reflection = higher intensity, capped at ~0.95
  const score = Math.min(0.45 + hits * 0.15 + Math.min(text.length / 2000, 0.2), 0.95)
  return { emotion, score: Number(score.toFixed(2)) }
}

// ─── ECHO reflection generation ───────────────────────────────────────────────

const OPENERS: Record<string, string[]> = {
  joy: ['There is real lightness in this.', 'You let yourself feel good here — that matters.'],
  sadness: ['This sounds heavy to carry.', 'I notice the weight in what you wrote.'],
  anger: ['There is a clear line here that got crossed.', 'The frustration is pointing at something you value.'],
  fear: ['Uncertainty is loud in this one.', 'I can feel you bracing for something.'],
  surprise: ['Something shifted unexpectedly.', 'This caught you off guard.'],
  anticipation: ['You are leaning toward something ahead.', 'There is forward motion in this.'],
  trust: ['You let your guard down a little here.', 'There is a sense of safety underneath this.'],
  love: ['Connection runs through this entry.', 'The people in this matter to you.'],
  neutral: ['You are taking stock.', 'This reads like a quiet checkpoint.'],
}

const THEME_SIGNALS: { tag: string; words: string[]; mirror: string }[] = [
  { tag: 'work', words: ['work', 'job', 'boss', 'deadline', 'project', 'meeting', 'career', 'launch', 'ship'], mirror: 'Work keeps showing up as a place where you measure yourself.' },
  { tag: 'relationships', words: ['friend', 'partner', 'family', 'mom', 'dad', 'love', 'alone', 'lonely', 'talk'], mirror: 'The people around you are doing a lot of the emotional lifting here.' },
  { tag: 'self-worth', words: ['enough', 'failure', 'fail', 'proud', 'worthless', 'good enough', 'compare', 'behind'], mirror: 'A quiet question about whether you are enough is underneath this.' },
  { tag: 'rest', words: ['tired', 'exhausted', 'sleep', 'rest', 'burnout', 'overwhelmed', 'busy'], mirror: 'Your body is asking for something your schedule has not given it.' },
  { tag: 'growth', words: ['learn', 'grow', 'better', 'change', 'start', 'try', 'goal', 'habit'], mirror: 'You keep reaching toward a version of yourself that is slightly ahead.' },
]

export function generateReflection(text: string, emotion: string): string {
  const lower = text.toLowerCase()
  const opener = pick(OPENERS[emotion] ?? OPENERS.neutral!, text)

  const theme = THEME_SIGNALS.find((t) => t.words.some((w) => lower.includes(w)))
  const mirror = theme
    ? theme.mirror
    : 'What you described is worth keeping — it is a real data point about who you are right now.'

  const close =
    emotion === 'sadness' || emotion === 'fear'
      ? 'You do not have to resolve it today. Naming it is already the work.'
      : emotion === 'joy' || emotion === 'love'
        ? 'Remember this one. These are the moments your future self will want to find.'
        : 'I will hold onto this and watch how it connects to what comes next.'

  return `${opener} ${mirror} ${close}`
}

// ─── Identity extraction ──────────────────────────────────────────────────────

const IDENTITY_SIGNALS: { match: string[]; node: Omit<IdentityNode, 'id' | 'user_id' | 'created_at' | 'updated_at'> }[] = [
  { match: ['help', 'others', 'support', 'care', 'team'], node: { type: 'value', label: 'Service to others', description: 'You measure good days partly by who you helped.', evidence: [], confidence: 0.6, polarity: 'positive', active: true } },
  { match: ['enough', 'failure', 'behind', 'compare', 'good enough'], node: { type: 'core_fear', label: 'Not being enough', description: 'A recurring fear that effort will not translate into worth.', evidence: [], confidence: 0.65, polarity: 'negative', active: true } },
  { match: ['build', 'create', 'make', 'ship', 'launch', 'write'], node: { type: 'strength', label: 'Builder instinct', description: 'You come alive when you are making something real.', evidence: [], confidence: 0.7, polarity: 'positive', active: true } },
  { match: ['alone', 'lonely', 'distance', 'withdraw'], node: { type: 'behavioral_pattern', label: 'Withdraws under stress', description: 'When overwhelmed you tend to isolate rather than reach out.', evidence: [], confidence: 0.55, polarity: 'negative', active: true } },
  { match: ['free', 'control', 'own', 'independent', 'choose'], node: { type: 'core_desire', label: 'Autonomy', description: 'You want a life you direct on your own terms.', evidence: [], confidence: 0.6, polarity: 'positive', active: true } },
]

export function extractIdentity(text: string, existing: IdentityNode[]): IdentityNode | null {
  const lower = text.toLowerCase()
  for (const sig of IDENTITY_SIGNALS) {
    if (sig.match.some((w) => lower.includes(w))) {
      const already = existing.find((n) => n.label === sig.node.label)
      if (already) {
        // Reinforce confidence instead of duplicating
        already.confidence = Math.min(0.98, already.confidence + 0.08)
        already.evidence = [...already.evidence, text.slice(0, 80)]
        return null
      }
      const now = new Date().toISOString()
      return {
        ...sig.node,
        id: `node-${Date.now()}`,
        user_id: 'demo',
        evidence: [text.slice(0, 80)],
        created_at: now,
        updated_at: now,
      }
    }
  }
  return null
}

// ─── Future Self generation ───────────────────────────────────────────────────

export function generateFutureSelf(entries: Entry[], nodes: IdentityNode[], horizon: '1m' | '3m' | '1y'): string {
  const dominantEmotion = mostCommon(entries.map((e) => e.emotion).filter(Boolean) as string[]) ?? 'reflective'
  const strength = nodes.find((n) => n.type === 'strength')?.label ?? 'your quiet persistence'
  const fear = nodes.find((n) => n.type === 'core_fear')?.label ?? 'the fear of falling behind'
  const desire = nodes.find((n) => n.type === 'core_desire')?.label?.toLowerCase() ?? 'a life on your own terms'

  const label = horizon === '1m' ? 'a month' : horizon === '3m' ? 'three months' : 'a year'

  return [
    `In ${label}, if you keep showing up the way you have been, here is what I see.`,
    ``,
    `You have been living mostly in ${dominantEmotion}. That has not been comfortable, but it has been honest — and honesty is the raw material I work from.`,
    ``,
    `${capitalize(strength)} is the thread that carries you forward. Every entry where you chose to make something instead of disappearing is a vote for the person you are becoming. Those votes are starting to add up.`,
    ``,
    `${capitalize(fear)} does not vanish in ${label}. But it gets quieter, because you stop needing it to be true. You will catch yourself, mid-spiral, and choose differently. That is the shift.`,
    ``,
    `The version of you ${label} from now is closer to ${desire} than you think. Not because the circumstances changed — because you stopped waiting for permission.`,
    ``,
    `— Your future self`,
  ].join('\n')
}

// ─── Seed data (a believable week of memory) ─────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export function seedEntries(): Entry[] {
  const raw: { content: string; emotion: string; score: number; ai: string; day: number }[] = [
    { day: 6, emotion: 'fear', score: 0.78, content: 'Launch is in two weeks and I keep finding bugs. Part of me is convinced this whole thing is going to flop and everyone will see I had no idea what I was doing.', ai: 'Uncertainty is loud in this one. A quiet question about whether you are enough is underneath this. You do not have to resolve it today — naming it is already the work.' },
    { day: 5, emotion: 'anger', score: 0.62, content: 'Wasted three hours in a meeting that should have been an email. I value my time and people just throw it away like it is nothing.', ai: 'There is a clear line here that got crossed. Work keeps showing up as a place where you measure yourself. I will hold onto this and watch how it connects to what comes next.' },
    { day: 4, emotion: 'sadness', score: 0.7, content: 'Skipped dinner with friends again to keep working. I told myself it was worth it but the apartment felt really empty tonight.', ai: 'This sounds heavy to carry. The people around you are doing a lot of the emotional lifting here. You do not have to resolve it today.' },
    { day: 3, emotion: 'anticipation', score: 0.66, content: 'Started sketching the next feature today and lost track of time. This is the part I actually love — making something out of nothing.', ai: 'You are leaning toward something ahead. You come alive when you are making something real. Remember this one.' },
    { day: 2, emotion: 'joy', score: 0.84, content: 'First real user emailed me to say the app helped them. I read it five times. Maybe this is actually working.', ai: 'There is real lightness in this. You measure good days partly by who you helped. Remember this one — these are the moments your future self will want to find.' },
    { day: 1, emotion: 'fear', score: 0.6, content: 'Good day yesterday but woke up anxious again. Scared the momentum is fake and I will be back to square one by Friday.', ai: 'I can feel you bracing for something. You keep reaching toward a version of yourself that is slightly ahead. Naming it is already the work.' },
  ]

  return raw.map((r, i) => ({
    id: `seed-${i}`,
    user_id: 'demo',
    content: r.content,
    voice_url: null,
    emotion: r.emotion,
    emotion_score: r.score,
    emotion_data: null,
    tags: [],
    ai_response: r.ai,
    echo_rating: null,
    word_count: r.content.split(/\s+/).length,
    created_at: daysAgo(r.day),
    updated_at: daysAgo(r.day),
  }))
}

export function seedIdentity(): IdentityNode[] {
  const now = new Date().toISOString()
  const base = (n: Partial<IdentityNode>): IdentityNode => ({
    id: n.id!, user_id: 'demo', type: n.type!, label: n.label!, description: n.description ?? null,
    evidence: n.evidence ?? [], confidence: n.confidence ?? 0.6, polarity: n.polarity ?? 'neutral',
    active: true, created_at: now, updated_at: now,
  })
  return [
    base({ id: 'n1', type: 'strength', label: 'Builder instinct', description: 'You come alive when you are making something real.', confidence: 0.82, polarity: 'positive' }),
    base({ id: 'n2', type: 'core_fear', label: 'Not being enough', description: 'A recurring fear that effort will not translate into worth.', confidence: 0.74, polarity: 'negative' }),
    base({ id: 'n3', type: 'value', label: 'Service to others', description: 'You measure good days partly by who you helped.', confidence: 0.68, polarity: 'positive' }),
    base({ id: 'n4', type: 'behavioral_pattern', label: 'Withdraws under stress', description: 'When overwhelmed you isolate rather than reach out.', confidence: 0.61, polarity: 'negative' }),
    base({ id: 'n5', type: 'core_desire', label: 'Autonomy', description: 'You want a life you direct on your own terms.', confidence: 0.65, polarity: 'positive' }),
  ]
}

export function seedPatterns(): BehavioralPattern[] {
  return [
    { id: 'p1', user_id: 'demo', pattern_type: 'energy', pattern_description: 'You sacrifice rest and connection during high-stakes work pushes.', frequency_days: 4, confidence: 0.72, trigger_tags: ['work', 'deadline'], last_seen_at: daysAgo(1), is_active: true },
    { id: 'p2', user_id: 'demo', pattern_type: 'emotional', pattern_description: 'Wins are quickly followed by anxiety that the momentum is not real.', frequency_days: 7, confidence: 0.66, trigger_tags: ['self-worth'], last_seen_at: daysAgo(1), is_active: true },
  ]
}

export function entriesToEmotionPoints(entries: Entry[]): EmotionPoint[] {
  return [...entries]
    .filter((e) => e.emotion && e.emotion_score != null)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    .map((e) => ({
      date: e.created_at.split('T')[0]!,
      emotion: e.emotion!,
      score: e.emotion_score!,
    }))
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], seed: string): T {
  const n = seed.length % arr.length
  return arr[n]!
}
function mostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null
  const counts: Record<string, number> = {}
  for (const x of arr) counts[x] = (counts[x] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
