/**
 * ECHO — simulation-batch
 *
 * Nightly batch runner that generates future-self simulations for all
 * Premium users who have ≥ 20 memories. Designed to be invoked by pg_cron
 * via net.http_post, or run directly as a cron job (e.g., Railway, Fly.io).
 *
 * Environment variables (required):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
 *   ANTHROPIC_API_KEY         — Claude API key
 *   CRON_SECRET               — Shared secret to authenticate cron calls
 *
 * Usage:
 *   node dist/index.js           — run batch immediately
 *   NODE_ENV=production node dist/index.js --dry-run — simulate without writes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL              = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY         = process.env.ANTHROPIC_API_KEY!
const DRY_RUN                   = process.argv.includes('--dry-run')

const HORIZONS: Array<{ months: 1 | 3 | 12; label: string }> = [
  { months: 1,  label: '1 month'  },
  { months: 3,  label: '3 months' },
  { months: 12, label: '1 year'   },
]

const MIN_MEMORIES    = 20
const RATE_LIMIT_MS   = 500  // pause between users to avoid Anthropic rate limits
const MAX_USERS_BATCH = 200  // safety cap per invocation

// ── Types ─────────────────────────────────────────────────────────────────────

interface IdentityNode {
  type:       string
  label:      string
  confidence: number
}

interface SimulationOutput {
  narrative:        string
  letter_text:      string
  trajectory_score: number
}

interface BatchResult {
  userId:       string
  processed:    number   // horizons completed
  errors:       number
  skipped:      boolean
}

// ── Anthropic helpers ─────────────────────────────────────────────────────────

async function callClaude(system: string, user: string, maxTokens = 1000): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content[0]?.text ?? ''
}

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

// ── Simulation generation ─────────────────────────────────────────────────────

async function generateSimulation(
  displayName: string,
  horizon: { months: number; label: string },
  identityNodes: IdentityNode[],
  recentMemories: string[],
  emotionSummary: string,
): Promise<SimulationOutput | null> {

  const nodesText = identityNodes
    .filter(n => n.confidence >= 0.5)
    .slice(0, 12)
    .map(n => `- [${n.type}] ${n.label} (confidence: ${Math.round(n.confidence * 100)}%)`)
    .join('\n')

  const memoriesText = recentMemories
    .slice(0, 10)
    .map((m, i) => `${i + 1}. ${m}`)
    .join('\n')

  const system = `You are a compassionate life-trajectory analyst for ECHO, an AI memory and identity platform.
You have deep insight into human psychology and growth patterns.
Your role is to generate a realistic, grounded future-self simulation based on a person's actual behavior and identity data.
Be specific, personal, and honest — avoid generic platitudes. Ground everything in their data.`

  const prompt = `Generate a future-self simulation for ${displayName} looking ${horizon.label} ahead.

Their current identity profile:
${nodesText}

Recent memories and reflections:
${memoriesText}

Current emotional trajectory: ${emotionSummary}

Respond ONLY with a JSON object in this exact format:
{
  "narrative": "3-4 sentences describing the most likely trajectory, grounded in their patterns",
  "letter_text": "A warm, specific letter from their future self (150-200 words). Start with 'Hey [name],'",
  "trajectory_score": <integer 0-100 representing overall growth momentum>
}

Base the trajectory_score on: consistency of identity (35%), emotional growth direction (35%), behavioral pattern strength (30%).`

  const raw = await callClaude(system, prompt, 800)
  return extractJson<SimulationOutput>(raw)
}

// ── Per-user processing ───────────────────────────────────────────────────────

async function processUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<BatchResult> {
  const result: BatchResult = { userId, processed: 0, errors: 0, skipped: false }

  // Fetch identity, memories, profile in parallel
  const [nodesRes, memoriesRes, profileRes] = await Promise.all([
    supabase
      .from('identity_nodes')
      .select('type, label, confidence')
      .eq('user_id', userId)
      .eq('active', true)
      .order('confidence', { ascending: false })
      .limit(20),

    supabase
      .from('memories')
      .select('content_chunk')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('profiles')
      .select('display_name')
      .eq('auth_id', userId)
      .single(),
  ])

  const identityNodes    = (nodesRes.data ?? []) as IdentityNode[]
  const memoryChunks     = (memoriesRes.data ?? []).map((m: { content_chunk: string }) => m.content_chunk)
  const displayName      = profileRes.data?.display_name ?? 'Friend'

  if (memoryChunks.length < MIN_MEMORIES) {
    result.skipped = true
    return result
  }

  // Fetch recent emotion summary from last 14 entries
  const emotionRes = await supabase
    .from('entries')
    .select('emotion')
    .eq('user_id', userId)
    .not('emotion', 'is', null)
    .order('created_at', { ascending: false })
    .limit(14)

  const emotions = (emotionRes.data ?? []).map((e: { emotion: string | null }) => e.emotion).filter(Boolean) as string[]
  const emotionCounts: Record<string, number> = {}
  emotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] ?? 0) + 1 })
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
  const emotionSummary = `Dominant emotion over last 14 entries: ${topEmotion} (${Math.round(((emotionCounts[topEmotion] ?? 0) / emotions.length) * 100)}% of entries)`

  // Generate simulations for each horizon
  for (const horizon of HORIZONS) {
    try {
      if (DRY_RUN) {
        console.log(`  [dry-run] Would generate ${horizon.label} simulation for ${userId.slice(0, 8)}`)
        result.processed++
        continue
      }

      const simulation = await generateSimulation(
        displayName,
        horizon,
        identityNodes,
        memoryChunks,
        emotionSummary,
      )

      if (!simulation) {
        console.warn(`  [warn] Failed to parse simulation for ${userId.slice(0, 8)} / ${horizon.label}`)
        result.errors++
        continue
      }

      // Upsert — UNIQUE constraint on (user_id, horizon_months)
      const { error } = await supabase
        .from('future_self_simulations')
        .upsert(
          {
            user_id:          userId,
            horizon_months:   horizon.months,
            narrative:        simulation.narrative,
            letter_text:      simulation.letter_text,
            trajectory_score: simulation.trajectory_score,
          },
          { onConflict: 'user_id,horizon_months' },
        )

      if (error) {
        console.error(`  [error] DB upsert failed for ${userId.slice(0, 8)}:`, error.message)
        result.errors++
      } else {
        result.processed++
      }

      // Small delay to avoid Anthropic rate-limits between horizons
      await sleep(200)
    } catch (err) {
      console.error(`  [error] Exception for ${userId.slice(0, 8)} / ${horizon.label}:`, err)
      result.errors++
    }
  }

  return result
}

// ── Main batch loop ───────────────────────────────────────────────────────────

async function runBatch(): Promise<void> {
  console.log(`[simulation-batch] Starting${DRY_RUN ? ' (DRY RUN)' : ''}…`)
  const startedAt = Date.now()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  if (!ANTHROPIC_API_KEY && !DRY_RUN) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Fetch premium users with enough memories
  const { data: candidates, error } = await supabase
    .from('users')
    .select('auth_id')
    .eq('subscription_tier', 'premium')
    .is('deleted_at', null)
    .limit(MAX_USERS_BATCH)

  if (error) {
    console.error('[simulation-batch] Failed to fetch users:', error.message)
    process.exit(1)
  }

  const users = candidates ?? []
  console.log(`[simulation-batch] Found ${users.length} premium users`)

  // Process each user sequentially (rate limit consideration)
  const results: BatchResult[] = []
  for (const { auth_id } of users) {
    process.stdout.write(`  Processing ${auth_id.slice(0, 8)}… `)
    const res = await processUser(supabase, auth_id)
    results.push(res)

    if (res.skipped) {
      console.log('skipped (insufficient memories)')
    } else {
      console.log(`done (${res.processed} simulations, ${res.errors} errors)`)
    }

    await sleep(RATE_LIMIT_MS)
  }

  // Summary
  const elapsed   = ((Date.now() - startedAt) / 1000).toFixed(1)
  const processed = results.filter(r => !r.skipped).length
  const skipped   = results.filter(r => r.skipped).length
  const totalSims = results.reduce((s, r) => s + r.processed, 0)
  const totalErrs = results.reduce((s, r) => s + r.errors, 0)

  console.log(`\n[simulation-batch] Complete in ${elapsed}s`)
  console.log(`  Users processed: ${processed}`)
  console.log(`  Users skipped:   ${skipped}`)
  console.log(`  Simulations:     ${totalSims}`)
  console.log(`  Errors:          ${totalErrs}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Entry point ───────────────────────────────────────────────────────────────

runBatch().catch(err => {
  console.error('[simulation-batch] Fatal error:', err)
  process.exit(1)
})
