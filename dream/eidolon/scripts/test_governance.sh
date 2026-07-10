#!/usr/bin/env bash
# Run every governance + Doctrine-enforcement test suite with one command.
#
# These suites are pure TypeScript executed with `tsx` (no build step, no DB, no
# Deno). They cover the server-side enforcement of Doctrines D4/D5/D6/D8 and the
# governance state machine. Exit non-zero if any suite fails.
#
#   ./scripts/test_governance.sh
#
# NOTE: the repo's .github/workflows/ci.yml does not currently run these (it targets
# backend/functions Jest, and the edge functions here are Deno/tsx). Until the CI
# rooting is resolved, this script is the reproducible entry point.
set -euo pipefail

cd "$(dirname "$0")/.."

SUITES=(
  "backend/supabase/functions/_shared/__tests__/guardrails.test.ts"
  "backend/supabase/functions/_shared/__tests__/consent.test.ts"
  "backend/supabase/functions/_shared/__tests__/narrative_honesty.test.ts"
  "backend/supabase/functions/_shared/__tests__/cognition.test.ts"
  "backend/supabase/functions/_shared/__tests__/reflection_prompt.test.ts"
  "docs/governance/state/soundness_check.ts"
  "docs/governance/state/current_state.test.ts"
)

fail=0
for s in "${SUITES[@]}"; do
  echo "▶ $s"
  if ! npx --yes tsx "$s"; then
    fail=1
    echo "✗ FAILED: $s"
  fi
  echo
done

if [[ "$fail" -ne 0 ]]; then
  echo "GOVERNANCE TESTS FAILED"
  exit 1
fi
echo "ALL GOVERNANCE TESTS PASSED"
