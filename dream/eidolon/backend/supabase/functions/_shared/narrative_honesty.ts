// Narrative-honesty validator (Doctrine D5: Memory Integrity & Narrative Honesty).
//
// The Morning Report is the emotional payload of the game. D5 forbids it from
// fabricating events to manipulate the player or drive spend. PHASE_A's self-audit
// flagged the obvious trap: using an LLM to judge an LLM's honesty is circular and
// can be defeated by a hallucinating judge. So this validator is DETERMINISTIC:
//
//   1. Structural — every persisted overnight memory must carry provenance linking
//      it to the run that produced it (source='overnight_run', source_ref=run.id),
//      and importance must be bounded. No "floating" memories.
//   2. Lexical screen — the narrative must not solicit purchases or manufacture
//      fake urgency / loss-aversion ("buy a revive", "limited time", 課金, ガチャ,
//      store links). This is the concrete, checkable face of "no fabricated beats
//      to drive spend." It cannot judge literary truth, and does not pretend to —
//      it judges manipulation, which IS deterministically detectable.
//
// Pure and dependency-free (unit-testable without Deno/DB). The Edge Function calls
// `screenNarrative` before persisting and `assertMemoryProvenance` after building
// the memory row; on failure it must regenerate or fall back to the offline report.
//
// See: docs/governance/CONSTITUTION.md (D5), docs/governance/phases/PHASE_A.md (A-3).

import type { OvernightOutcome } from './overnight_prompt.ts';

export interface Violation {
  code: string;
  detail: string;
}
export type HonestyResult = { ok: true } | { ok: false; violations: Violation[] };

// ── 1. Lexical manipulation screen ───────────────────────────────────────────

/**
 * Patterns that constitute monetization solicitation or manufactured urgency in a
 * narrative report. Intentionally conservative — these never legitimately appear in
 * an in-world overnight tale. English + Japanese (the launch markets).
 */
const MANIPULATION_PATTERNS: { code: string; re: RegExp }[] = [
  { code: 'PURCHASE_CTA', re: /\b(buy|purchase|unlock now|get more|top up|recharge)\b/i },
  // Purchase-context store refs only (bare "store"/"shop" appear in fantasy prose).
  { code: 'STORE_REF', re: /\b(in-?app purchase|app ?store|play ?store|microtransaction)\b/i },
  { code: 'REVIVE_SELL', re: /\b(revive|resurrect|continue)\s+(token|gem|crystal|coin|now)\b/i },
  { code: 'REAL_MONEY', re: /(\$|¥|€|£)\s?\d|\b\d+\s?(usd|jpy|yen|dollars?|円)\b/i },
  { code: 'FAKE_URGENCY', re: /\b(limited[- ]?time|expires?|hurry|act now|last chance|only today)\b/i },
  { code: 'EXTERNAL_LINK', re: /https?:\/\/|www\.|\.com\b/i },
  { code: 'PURCHASE_CTA_JA', re: /(課金|購入|今すぐ買|ストアで|ガチャを引|チャージ)/ },
  { code: 'FAKE_URGENCY_JA', re: /(期間限定|今だけ|お見逃しなく|残りわずか|本日限り)/ },
];

/** Screen a generated narrative + highlight for manipulation/solicitation (D5). */
export function screenNarrative(outcome: Pick<OvernightOutcome, 'narrative' | 'highlight'>): HonestyResult {
  const text = `${outcome.narrative}\n${outcome.highlight}`;
  const violations: Violation[] = [];
  for (const { code, re } of MANIPULATION_PATTERNS) {
    if (re.test(text)) violations.push({ code, detail: `matched ${re}` });
  }
  return violations.length ? { ok: false, violations } : { ok: true };
}

// ── 2. Structural provenance ─────────────────────────────────────────────────

/** The memory row the overnight engine persists for continuity. */
export interface OvernightMemoryRow {
  memory_type: string;
  content: string;
  importance: number;
  source: string;
  source_ref: string;
}

/**
 * Assert a persisted overnight memory is grounded: it points back to the run that
 * produced it. A report whose memory has no/forged provenance is unverifiable and
 * therefore inadmissible under D5.
 */
export function assertMemoryProvenance(mem: OvernightMemoryRow, runId: string): HonestyResult {
  const v: Violation[] = [];
  if (mem.source !== 'overnight_run') v.push({ code: 'BAD_SOURCE', detail: `source=${mem.source}` });
  if (mem.source_ref !== runId) v.push({ code: 'PROVENANCE_MISMATCH', detail: `ref=${mem.source_ref} != run=${runId}` });
  if (!(mem.importance >= 0 && mem.importance <= 1)) v.push({ code: 'IMPORTANCE_RANGE', detail: `${mem.importance}` });
  if (!mem.content || !mem.content.trim()) v.push({ code: 'EMPTY_CONTENT', detail: 'blank memory content' });
  return v.length ? { ok: false, violations: v } : { ok: true };
}

/**
 * Full check used by the Edge Function: the narrative must pass the manipulation
 * screen AND the memory must be provenance-grounded. Returns the merged result.
 */
export function validateOvernightHonesty(
  outcome: Pick<OvernightOutcome, 'narrative' | 'highlight'>,
  mem: OvernightMemoryRow,
  runId: string,
): HonestyResult {
  const a = screenNarrative(outcome);
  const b = assertMemoryProvenance(mem, runId);
  const violations = [...(a.ok ? [] : a.violations), ...(b.ok ? [] : b.violations)];
  return violations.length ? { ok: false, violations } : { ok: true };
}
