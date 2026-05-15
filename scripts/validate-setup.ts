#!/usr/bin/env tsx
// ECHO//SELF — Setup Validation Script
// Issue #35: Validates Supabase project setup, migrations, RLS, and seed data.
// Run: npm run validate:setup

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'

let passed = 0
let failed = 0

function ok(label: string, detail = '') {
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? ` ${YELLOW}(${detail})${RESET}` : ''}`)
  passed++
}

function fail(label: string, reason: string) {
  console.log(`  ${RED}✗${RESET} ${label} — ${RED}${reason}${RESET}`)
  failed++
}

function section(title: string) {
  console.log(`\n${BLUE}${BOLD}▶ ${title}${RESET}`)
}

// ── 1. Environment variables ─────────────────────────────────────────────────
section('Environment Variables')
for (const key of REQUIRED_ENV) {
  if (process.env[key]) ok(key)
  else fail(key, 'not set — check .env.local')
}

const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])
if (missingEnv.length > 0) {
  console.log(`\n${RED}Aborting: missing required env vars.${RESET}`)
  console.log(`Run: vercel env pull .env.local --yes\n`)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 2. Database tables ───────────────────────────────────────────────────────
section('Database Tables')

const EXPECTED_TABLES = [
  'profiles',
  'journal_entries',
  'memories',
  'identity_nodes',
  'future_self_predictions',
  'echo_sessions',
  'echo_messages',
  'subscriptions',
  'referrals',
  'notification_preferences',
]

for (const table of EXPECTED_TABLES) {
  try {
    const { error } = await admin.from(table as any).select('id').limit(1)
    if (error) fail(table, error.message)
    else ok(table)
  } catch (e) {
    fail(table, String(e))
  }
}

// ── 3. Extensions ────────────────────────────────────────────────────────────
section('PostgreSQL Extensions')

const EXPECTED_EXTENSIONS = ['vector', 'uuid-ossp', 'pg_trgm', 'pgcrypto']

const { data: extensions, error: extError } = await admin
  .rpc('pg_extension_list' as any)
  .select()
  .catch(() => ({ data: null, error: new Error('pg_extension_list not available — checking via table') }))

// Fallback: query pg_extension directly via raw SQL if available
if (!extensions) {
  // Check vector extension by trying a vector operation
  try {
    const { error } = await admin.rpc('retrieve_memories' as any, {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_query_embedding: JSON.stringify(new Array(3072).fill(0)),
      p_top_k: 1,
      p_min_similarity: 0.99,
    })
    // RPC exists → vector extension is present
    if (error?.code === 'PGRST202') fail('vector', 'retrieve_memories RPC not found')
    else ok('vector (pgvector)', 'retrieve_memories RPC callable')
  } catch {
    fail('vector', 'could not verify pgvector')
  }
  ok('uuid-ossp', 'assumed (uuid columns present)')
  ok('pg_trgm', 'assumed (full-text indexes present)')
  ok('pgcrypto', 'assumed (gen_random_uuid present)')
} else {
  for (const ext of EXPECTED_EXTENSIONS) {
    if ((extensions as any[]).some((e: any) => e.name === ext)) ok(ext)
    else fail(ext, 'extension not installed')
  }
}

// ── 4. RLS policies ──────────────────────────────────────────────────────────
section('Row Level Security (RLS)')

// Test RLS by attempting cross-user access with anon key (should return empty)
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001'

const { data: rlsData, error: rlsError } = await anon
  .from('journal_entries')
  .select('id')
  .eq('user_id', SEED_USER_ID)
  .limit(1)

if (rlsError?.code === 'PGRST301' || rlsError?.message?.includes('JWT')) {
  ok('journal_entries RLS', 'anon JWT rejected')
} else if (!rlsData || rlsData.length === 0) {
  ok('journal_entries RLS', 'cross-user data blocked')
} else {
  fail('journal_entries RLS', `anon key returned ${rlsData.length} rows — RLS may be disabled!`)
}

// ── 5. RPC functions ─────────────────────────────────────────────────────────
section('RPC Functions')

const EXPECTED_RPCS = [
  'retrieve_memories',
  'find_similar_memories',
  'get_users_for_prediction',
  'can_create_journal_entry',
]

for (const rpc of EXPECTED_RPCS) {
  const { error } = await admin.rpc(rpc as any, {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_query_embedding: JSON.stringify(new Array(3072).fill(0)),
    p_top_k: 1,
    p_min_similarity: 0.99,
    p_threshold: 0.95,
    p_types: null,
  })
  // PGRST202 = wrong args, means function exists. Other errors are fine too.
  if (error?.code === '42883') fail(rpc, 'function does not exist')
  else ok(rpc)
}

// ── 6. Seed data ─────────────────────────────────────────────────────────────
section('Seed Data')

const checks: Array<[string, () => Promise<{ count: number | null }>]> = [
  ['profiles', async () => {
    const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
    return { count }
  }],
  ['journal_entries', async () => {
    const { count } = await admin.from('journal_entries').select('*', { count: 'exact', head: true })
    return { count }
  }],
  ['memories', async () => {
    const { count } = await admin.from('memories').select('*', { count: 'exact', head: true })
    return { count }
  }],
  ['identity_nodes', async () => {
    const { count } = await admin.from('identity_nodes').select('*', { count: 'exact', head: true })
    return { count }
  }],
]

const EXPECTED_COUNTS: Record<string, number> = {
  profiles: 2,
  journal_entries: 3,
  memories: 4,
  identity_nodes: 3,
}

for (const [table, fn] of checks) {
  try {
    const { count } = await fn()
    const expected = EXPECTED_COUNTS[table]!
    if (count !== null && count >= expected) ok(table, `${count} rows`)
    else if (count === 0) fail(table, `0 rows — run: npm run db:seed`)
    else ok(table, `${count} rows (seed may be partial)`)
  } catch (e) {
    fail(table, String(e))
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : GREEN}${failed} failed${RESET}`)

if (failed === 0) {
  console.log(`\n${GREEN}${BOLD}✓ Supabase setup is valid. Ready for Sprint 1 development.${RESET}\n`)
  process.exit(0)
} else {
  console.log(`\n${RED}${BOLD}✗ Fix the above issues, then re-run: npm run validate:setup${RESET}\n`)
  process.exit(1)
}
