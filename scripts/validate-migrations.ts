#!/usr/bin/env tsx
// ECHO//SELF — Migration Validation Script
// Used by CI (.github/workflows/ci.yml supabase-migrations job).
// Checks that all migration files are present and correctly ordered.
// Run: npm run validate:migrations

import * as fs from 'node:fs'
import * as path from 'node:path'

const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

const REQUIRED_MIGRATIONS = [
  { file: '001_initial_schema.sql',        tables: ['profiles'],          functions: ['handle_new_user', 'set_updated_at'] },
  { file: '002_journal.sql',               tables: ['journal_entries'],   functions: ['update_streak'] },
  { file: '003_ai_memory.sql',             tables: ['memories'],          functions: ['retrieve_memories', 'find_similar_memories'] },
  { file: '004_identity_monetization.sql', tables: ['identity_nodes', 'subscriptions', 'referrals'], functions: ['can_create_journal_entry'] },
]

let passed = 0
let failed = 0

function ok(msg: string)   { console.log(`  ${GREEN}✓${RESET} ${msg}`); passed++ }
function fail(msg: string) { console.log(`  ${RED}✗${RESET} ${msg}`);   failed++ }

console.log(`\n${BOLD}▶ Migration Files${RESET}`)

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.log(`${RED}✗ supabase/migrations/ directory not found${RESET}`)
  process.exit(1)
}

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

for (const { file, tables, functions } of REQUIRED_MIGRATIONS) {
  const filepath = path.join(MIGRATIONS_DIR, file)

  if (!fs.existsSync(filepath)) {
    fail(`${file} — MISSING`)
    continue
  }

  const sql = fs.readFileSync(filepath, 'utf-8')

  // Check required table definitions
  const missingTables = tables.filter((t) => !sql.includes(`CREATE TABLE`) || !sql.includes(t))
  const missingFunctions = functions.filter((f) => !sql.includes(f))

  if (missingTables.length > 0) {
    fail(`${file} — missing table definitions: ${missingTables.join(', ')}`)
  } else if (missingFunctions.length > 0) {
    fail(`${file} — missing functions: ${missingFunctions.join(', ')}`)
  } else {
    ok(`${file} (tables: ${tables.join(', ')})`)
  }
}

// Check for RLS on all files
console.log(`\n${BOLD}▶ RLS Policies${RESET}`)
for (const { file, tables } of REQUIRED_MIGRATIONS) {
  const filepath = path.join(MIGRATIONS_DIR, file)
  if (!fs.existsSync(filepath)) continue

  const sql = fs.readFileSync(filepath, 'utf-8')
  for (const table of tables) {
    if (sql.includes(`ENABLE ROW LEVEL SECURITY`) || sql.includes(`ENABLE ROW-LEVEL SECURITY`)) {
      ok(`${table} — RLS enabled`)
    } else if (sql.includes(table) && sql.includes('POLICY')) {
      ok(`${table} — policies present`)
    } else {
      fail(`${table} — RLS or policy not found in ${file}`)
    }
  }
}

// Check pgvector in memory migration
console.log(`\n${BOLD}▶ pgvector Configuration${RESET}`)
const memMig = path.join(MIGRATIONS_DIR, '003_ai_memory.sql')
if (fs.existsSync(memMig)) {
  const sql = fs.readFileSync(memMig, 'utf-8')
  if (sql.includes('vector(3072)'))  ok('VECTOR(3072) dimension configured')
  else fail('VECTOR(3072) — dimension not found in 003_ai_memory.sql')
  if (sql.includes('ivfflat'))       ok('IVFFlat index present')
  else fail('IVFFlat index — not found in 003_ai_memory.sql')
  if (sql.includes('lists=100') || sql.includes('lists = 100')) ok('IVFFlat lists=100')
  else fail('IVFFlat lists=100 — check index definition')
}

// Summary
console.log(`\n${'─'.repeat(50)}`)
console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : GREEN}${failed} failed${RESET}`)

if (failed > 0) {
  console.log(`${RED}${BOLD}✗ Migration validation failed${RESET}\n`)
  process.exit(1)
} else {
  console.log(`${GREEN}${BOLD}✓ All migrations valid${RESET}\n`)
  process.exit(0)
}
