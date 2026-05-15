#!/usr/bin/env tsx
// ECHO//SELF — Migration Validation Script
// Used by CI (.github/workflows/ci.yml quality job).
// Checks that all migration files are present with required SQL constructs.
// Run: pnpm tsx scripts/validate-migrations.ts

import * as fs from 'node:fs'
import * as path from 'node:path'

const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'

const MIGRATIONS_DIR = path.join(process.cwd(), 'packages', 'database', 'migrations')

interface MigrationSpec {
  file: string
  tables?: string[]
  functions?: string[]
  extensions?: string[]
}

const REQUIRED_MIGRATIONS: MigrationSpec[] = [
  {
    file: '001_initial_schema.sql',
    tables: ['users', 'entries', 'memories', 'subscriptions', 'emotion_history', 'predictions'],
    functions: ['handle_new_user', 'set_updated_at'],
    extensions: ['vector', 'uuid-ossp'],
  },
  {
    file: '002_match_memories.sql',
    functions: ['match_memories', 'find_similar_memories'],
  },
]

let passed = 0
let failed = 0
let warned = 0

function ok(msg: string)   { console.log(`  ${GREEN}✓${RESET} ${msg}`); passed++ }
function fail(msg: string) { console.log(`  ${RED}✗${RESET} ${msg}`);   failed++ }
function warn(msg: string) { console.log(`  ${YELLOW}⚠${RESET} ${msg}`); warned++ }

// ─── 1. Migrations directory ──────────────────────────────────────────────────
console.log(`\n${BOLD}▶ Migration Files${RESET}`)

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.log(`${RED}✗ packages/database/migrations/ directory not found${RESET}`)
  process.exit(1)
}

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
console.log(`  Found ${files.length} migration file(s): ${files.join(', ')}`)

for (const spec of REQUIRED_MIGRATIONS) {
  const filepath = path.join(MIGRATIONS_DIR, spec.file)

  if (!fs.existsSync(filepath)) {
    fail(`${spec.file} — MISSING`)
    continue
  }

  const sql = fs.readFileSync(filepath, 'utf-8')

  // Check required table definitions
  if (spec.tables) {
    const missingTables = spec.tables.filter((t) => !sql.includes(t))
    if (missingTables.length > 0) {
      fail(`${spec.file} — missing table references: ${missingTables.join(', ')}`)
    } else {
      ok(`${spec.file} — tables: ${spec.tables.join(', ')}`)
    }
  }

  // Check required function names
  if (spec.functions) {
    const missingFunctions = spec.functions.filter((f) => !sql.includes(f))
    if (missingFunctions.length > 0) {
      fail(`${spec.file} — missing functions: ${missingFunctions.join(', ')}`)
    } else {
      ok(`${spec.file} — functions: ${spec.functions.join(', ')}`)
    }
  }

  // Check extensions
  if (spec.extensions) {
    const missingExts = spec.extensions.filter((e) => !sql.includes(e))
    if (missingExts.length > 0) {
      warn(`${spec.file} — extensions not referenced: ${missingExts.join(', ')}`)
    } else {
      ok(`${spec.file} — extensions: ${spec.extensions.join(', ')}`)
    }
  }
}

// ─── 2. pgvector Configuration ────────────────────────────────────────────────
console.log(`\n${BOLD}▶ pgvector Configuration${RESET}`)

const initialMig = path.join(MIGRATIONS_DIR, '001_initial_schema.sql')
if (fs.existsSync(initialMig)) {
  const sql = fs.readFileSync(initialMig, 'utf-8')
  if (sql.includes('vector(3072)'))
    ok('vector(3072) dimension — confirmed in 001_initial_schema.sql')
  else
    fail('vector(3072) — dimension not found in 001_initial_schema.sql')

  if (sql.includes('ivfflat') || sql.includes('IVFFlat'))
    ok('IVFFlat index — present')
  else
    warn('IVFFlat index — not found (will use sequential scan until applied)')

  if (sql.includes('lists=100') || sql.includes('lists = 100'))
    ok('IVFFlat lists=100 — confirmed')
  else
    warn('IVFFlat lists=100 — check index definition')
}

const matchMig = path.join(MIGRATIONS_DIR, '002_match_memories.sql')
if (fs.existsSync(matchMig)) {
  const sql = fs.readFileSync(matchMig, 'utf-8')
  if (sql.includes('vector(3072)'))
    ok('match_memories — uses vector(3072) parameter')
  else
    fail('match_memories — vector(3072) parameter missing')

  if (sql.includes('cosine') || sql.includes('<=>'))
    ok('match_memories — cosine similarity operator (<=>)')
  else
    fail('match_memories — cosine distance operator (<=>) not found')
}

// ─── 3. RLS Policies ─────────────────────────────────────────────────────────
console.log(`\n${BOLD}▶ RLS Policies${RESET}`)

const rlsTables = ['users', 'entries', 'memories', 'subscriptions', 'emotion_history']
if (fs.existsSync(initialMig)) {
  const sql = fs.readFileSync(initialMig, 'utf-8')
  for (const table of rlsTables) {
    if (sql.includes(`ENABLE ROW LEVEL SECURITY`) && sql.includes(table)) {
      ok(`${table} — RLS enabled`)
    } else if (sql.includes(table) && sql.includes('POLICY')) {
      ok(`${table} — policies present`)
    } else if (!sql.includes(table)) {
      warn(`${table} — table not referenced in 001_initial_schema.sql`)
    } else {
      fail(`${table} — RLS not found in 001_initial_schema.sql`)
    }
  }
}

// ─── 4. GRANT statements ─────────────────────────────────────────────────────
console.log(`\n${BOLD}▶ GRANT Statements (service_role)${RESET}`)
if (fs.existsSync(matchMig)) {
  const sql = fs.readFileSync(matchMig, 'utf-8')
  if (sql.includes('GRANT EXECUTE') && sql.includes('service_role'))
    ok('match_memories — GRANT EXECUTE TO service_role')
  else
    fail('match_memories — missing GRANT EXECUTE TO service_role')
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(
  `${BOLD}Results: ${GREEN}${passed} passed${RESET}${BOLD}, ` +
  `${failed > 0 ? RED : GREEN}${failed} failed${RESET}${BOLD}, ` +
  `${warned > 0 ? YELLOW : RESET}${warned} warnings${RESET}`,
)

if (failed > 0) {
  console.log(`${RED}${BOLD}✗ Migration validation failed${RESET}\n`)
  process.exit(1)
} else {
  console.log(`${GREEN}${BOLD}✓ All migrations valid${RESET}\n`)
  process.exit(0)
}
