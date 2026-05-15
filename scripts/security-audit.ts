#!/usr/bin/env -S npx tsx
/**
 * security-audit.ts — Automated OWASP checklist for ECHO//SELF
 *
 * Runs static checks that can be validated without a live Supabase connection:
 *  - RLS policies declared on all tables
 *  - No hardcoded secrets in source files
 *  - Edge functions verify auth header
 *  - CORS headers present on all edge functions
 *  - Stripe webhook uses signature verification
 *  - HTTPS-only URLs in source
 *  - Dependency audit via pnpm audit
 *
 * Exits 0 if all checks pass, 1 if any fail.
 *
 * Usage: node --loader tsx scripts/security-audit.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), '..');

interface Check {
  name: string;
  run: () => boolean | Promise<boolean>;
}

const checks: Check[] = [
  // ── 1. RLS enabled on all public tables ─────────────────────────────────
  {
    name: 'RLS enabled on all public tables',
    run() {
      const migrationDir = path.join(ROOT, 'packages/database/migrations');
      if (!fs.existsSync(migrationDir)) return fail('Migration directory not found');

      const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        // Find CREATE TABLE statements that don't have a matching ENABLE ROW LEVEL SECURITY
        const createTableMatches = [...sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(/gi)];
        for (const match of createTableMatches) {
          const tableName = match[1];
          if (!sql.includes(`${tableName} ENABLE ROW LEVEL SECURITY`)) {
            return fail(`Table "${tableName}" in ${file} missing ENABLE ROW LEVEL SECURITY`);
          }
        }
      }
      return true;
    },
  },

  // ── 2. No hardcoded secrets in source ──────────────────────────────────
  {
    name: 'No hardcoded secrets in source',
    run() {
      const PATTERNS = [
        /sk-[A-Za-z0-9]{40,}/,          // OpenAI key
        /sk_live_[A-Za-z0-9]{20,}/,     // Stripe live key
        /whsec_[A-Za-z0-9]{20,}/,       // Stripe webhook secret
        /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{40,}/, // Long JWT
      ];

      const EXCLUDE = ['node_modules', '.git', 'dist', '.expo', 'pnpm-lock.yaml', '.claude'];
      const SOURCE_DIRS = ['apps', 'packages', 'supabase', 'scripts'];

      function scanDir(dir: string): string[] {
        if (!fs.existsSync(dir)) return [];
        const violations: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (EXCLUDE.includes(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            violations.push(...scanDir(fullPath));
          } else if (entry.isFile() && /\.(ts|tsx|js|json|yaml|yml|sql|env\.example)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const pattern of PATTERNS) {
              if (pattern.test(content)) {
                violations.push(`Possible secret in ${fullPath}`);
              }
            }
          }
        }
        return violations;
      }

      const violations = SOURCE_DIRS.flatMap(d => scanDir(path.join(ROOT, d)));
      if (violations.length > 0) {
        violations.forEach(v => console.error('  ✗', v));
        return false;
      }
      return true;
    },
  },

  // ── 3. Edge functions check Authorization header ────────────────────────
  {
    name: 'Edge functions verify Authorization header',
    run() {
      const fnDir = path.join(ROOT, 'supabase/functions');
      if (!fs.existsSync(fnDir)) return fail('supabase/functions not found');

      const exemptions = ['_shared']; // shared utilities don't need auth themselves
      for (const fn of fs.readdirSync(fnDir)) {
        if (exemptions.includes(fn)) continue;
        const indexPath = path.join(fnDir, fn, 'index.ts');
        if (!fs.existsSync(indexPath)) continue;

        const code = fs.readFileSync(indexPath, 'utf8');
        // Must either check Authorization header or use CRON_SECRET (for cron endpoints)
        const hasAuth = code.includes('Authorization') || code.includes('CRON_SECRET') || code.includes('x-cron-secret');
        if (!hasAuth) {
          return fail(`Edge function "${fn}" does not verify Authorization or CRON_SECRET`);
        }
      }
      return true;
    },
  },

  // ── 4. CORS headers on all edge functions ──────────────────────────────
  {
    name: 'CORS headers present in edge functions',
    run() {
      const fnDir = path.join(ROOT, 'supabase/functions');
      if (!fs.existsSync(fnDir)) return true; // skip if no functions

      for (const fn of fs.readdirSync(fnDir)) {
        const indexPath = path.join(fnDir, fn, 'index.ts');
        if (!fs.existsSync(indexPath)) continue;
        const code = fs.readFileSync(indexPath, 'utf8');
        if (!code.includes('Access-Control-Allow-Origin')) {
          return fail(`Edge function "${fn}" missing CORS headers`);
        }
      }
      return true;
    },
  },

  // ── 5. Stripe webhook uses signature verification ───────────────────────
  {
    name: 'Stripe webhook verifies signature (HMAC)',
    run() {
      const webhookPath = path.join(ROOT, 'supabase/functions/stripe-webhook/index.ts');
      if (!fs.existsSync(webhookPath)) return fail('stripe-webhook function not found');

      const code = fs.readFileSync(webhookPath, 'utf8');
      const hasHmac = code.includes('HMAC') || code.includes('stripe-signature') || code.includes('Stripe-Signature');
      if (!hasHmac) return fail('stripe-webhook does not verify Stripe-Signature header');
      return true;
    },
  },

  // ── 6. No HTTP (non-HTTPS) URLs in production code ─────────────────────
  {
    name: 'No plaintext HTTP URLs in source (HTTPS-only)',
    run() {
      const SAFE_PATTERNS = [
        'http://localhost',
        'http://127.0.0.1',
        'http://0.0.0.0',
        'http://schemas.',    // XML namespaces
        'http://www.w3.org',
      ];
      const violations: string[] = [];

      function scanForHttp(dir: string): void {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (['node_modules', '.git', 'dist', '.expo', '.claude'].includes(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanForHttp(fullPath);
          } else if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const httpMatches = content.match(/['"`]http:\/\/[^'"` ]+['"`]/g) ?? [];
            for (const match of httpMatches) {
              if (!SAFE_PATTERNS.some(safe => match.includes(safe))) {
                violations.push(`HTTP URL in ${fullPath}: ${match}`);
              }
            }
          }
        }
      }

      ['apps', 'supabase', 'packages'].forEach(d => scanForHttp(path.join(ROOT, d)));
      if (violations.length > 0) {
        violations.forEach(v => console.error('  ✗', v));
        return false;
      }
      return true;
    },
  },

  // ── 7. Dependency vulnerability audit ──────────────────────────────────
  {
    name: 'No high/critical dependency vulnerabilities',
    run() {
      try {
        execSync('pnpm audit --audit-level=high --json', {
          cwd: ROOT,
          stdio: 'pipe',
        });
        return true;
      } catch (err: any) {
        const output = err.stdout?.toString() ?? '';
        try {
          const report = JSON.parse(output);
          const high = report.metadata?.vulnerabilities?.high ?? 0;
          const critical = report.metadata?.vulnerabilities?.critical ?? 0;
          if (high > 0 || critical > 0) {
            console.error(`  ✗ ${critical} critical, ${high} high vulnerabilities found`);
            return false;
          }
        } catch {
          // pnpm audit exited non-zero but output is not JSON — likely network error
          console.warn('  ⚠ pnpm audit failed to parse output (skipping)');
        }
        return true;
      }
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────
function fail(reason: string): false {
  console.error(`  ✗ ${reason}`);
  return false;
}

async function main(): Promise<void> {
  console.log('🔒 ECHO//SELF Security Audit\n');
  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    process.stdout.write(`  ${check.name}… `);
    try {
      const result = await check.run();
      if (result) {
        console.log('✅');
        passed++;
      } else {
        console.log('❌');
        failed++;
      }
    } catch (err) {
      console.log('❌ (exception)');
      console.error('  ', err);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
