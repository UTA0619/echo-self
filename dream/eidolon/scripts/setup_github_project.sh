#!/usr/bin/env bash
# Create Eidolon's progress-management scaffold on GitHub: labels, milestones,
# the initial issue backlog (derived from docs/governance/phases/PHASE_A.md and the
# state-machine obligations), and optionally a Projects v2 board.
#
# Destination-agnostic — works for whichever repo you point it at:
#   REPO=super-uta/eidolon ./scripts/setup_github_project.sh
#   REPO=UTA0619/echo-self ./scripts/setup_github_project.sh
#   REPO=super-uta/eidolon BOARD=1 BOARD_OWNER=super-uta ./scripts/setup_github_project.sh
#
# Requires: gh authenticated with `repo` scope for the target owner (and `project`
# scope if BOARD=1). Idempotent-ish: re-running skips labels that already exist.
set -euo pipefail

REPO="${REPO:?set REPO=owner/repo}"
BOARD="${BOARD:-0}"
BOARD_OWNER="${BOARD_OWNER:-${REPO%%/*}}"

say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

# ── Labels ────────────────────────────────────────────────────────────────────
say "Labels"
label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null && echo "  + $1"; }
label "phase:A" "0e8a16" "Phase A — Honest & Bounded Alpha"
label "phase:B" "1d76db" "Phase B — Soft Launch"
label "phase:C" "5319e7" "Phase C — Monetization On"
label "phase:D" "b60205" "Phase D — Social Scale"
label "phase:E" "000000" "Phase E — Target (25K MAU / \$40K)"
for d in D1 D2 D3 D4 D5 D6 D7 D8 D9 D10; do label "doctrine:$d" "fbca04" "Bound to Constitution $d"; done
label "type:feat" "a2eeef" "New capability"
label "type:bug" "d73a4a" "Defect"
label "type:compliance" "e99695" "Doctrine / legal / store compliance"
label "type:infra" "c5def5" "Infra, CI, stability"
label "type:test" "bfdadc" "Testing / QA"
label "type:docs" "0075ca" "Docs / governance"
label "priority:P0" "b60205" "Blocks the phase"
label "priority:P1" "d93f0b" "Strongly recommended"
label "priority:P2" "fbca04" "Nice to have"
label "blocked:toolchain" "555555" "Needs Flutter/Dart toolchain"
label "area:mobile" "c2e0c6" "apps/mobile (Flutter)"
label "area:backend" "bfd4f2" "backend (Supabase/Firebase)"
label "area:governance" "ededed" "docs/governance"

# ── Milestones ────────────────────────────────────────────────────────────────
say "Milestones"
ms() {
  # create if absent; capture number
  local title="$1" desc="$2"
  local num
  num=$(gh api "repos/$REPO/milestones?state=all" --jq ".[] | select(.title==\"$title\") | .number" 2>/dev/null | head -1)
  if [[ -z "$num" ]]; then
    num=$(gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" --jq '.number')
    echo "  + [$num] $title"
  else
    echo "  = [$num] $title (exists)"
  fi
  echo "$num"
}
M_A=$(ms "Phase A: Honest & Bounded Alpha" "Prove the soul-twin is honest & safe before any player/revenue. Exit -> Soft Launch." | tail -1)
M_B=$(ms "Phase B: Soft Launch" "Closed beta, telemetry, ~1000 MAU, healthy D7-compliant retention." | tail -1)
M_C=$(ms "Phase C: Monetization On" "Paid tiers + gacha live. Requires independent reviewer + no-power-for-pay audit." | tail -1)
M_D=$(ms "Phase D: Social Scale" "Async social / guilds at scale (~15K MAU). Requires GDPR/APPI review." | tail -1)
M_E=$(ms "Phase E: Target" "25K MAU / \$40K MRR — the 24-month north-star." | tail -1)

# ── Issues ────────────────────────────────────────────────────────────────────
say "Issues"
issue() {
  local title="$1" milestone="$2" labels="$3" body="$4"
  local url
  url=$(gh issue create --repo "$REPO" --title "$title" --milestone "$milestone" --label "$labels" --body "$body")
  echo "  + $url"
}

issue "[A-1] Consent toggle + REVOKE UI (Dart)" "Phase A: Honest & Bounded Alpha" \
  "phase:A,doctrine:D4,type:feat,area:mobile,priority:P0,blocked:toolchain" \
  $'Client half of the consent ledger (server done in PR #110).\n\n**Doctrine:** D4 (granular, revocable consent).\n**Paths:** new `apps/mobile/lib/features/consent/`; wire to Reality Sync + Async Social.\n**Acceptance:** per-signal toggles (steps/sleep/hrv/emotion + social_visit/trade/duel/memory_exchange); revoke takes effect immediately with no penalty; reads/writes `consent_grants`.\n**Obligation:** OBL_CONSENT_UI (blocks Phase B).'

issue "[A-2] EidolonProfile guardrail fields + settings UI (Dart)" "Phase A: Honest & Bounded Alpha" \
  "phase:A,doctrine:D6,type:feat,area:mobile,priority:P0,blocked:toolchain" \
  $'Client half of bounded autonomy (server + columns done in PR #110, migration 014).\n\n**Doctrine:** D6 (bounded autonomy).\n**Paths:** `packages/shared_types/.../eidolon_profile.dart` add `riskTolerance`/`socialOpenness`; settings UI to tune them.\n**Acceptance:** player can set risk tolerance & social openness; values persist to `eidolons.risk_tolerance/social_openness`.\n**Obligation:** OBL_D6_GUARDRAILS_UI (blocks Phase B).'

issue "[A-3] Apply migrations 013/014 + Postgres integration test" "Phase A: Honest & Bounded Alpha" \
  "phase:A,type:infra,area:backend,priority:P0" \
  $'Migrations 013 (consent ledger) and 014 (eidolon guardrails) were authored (PR #110) but NOT applied against a live Postgres.\n\n**Acceptance:** `supabase db push` succeeds on a clean DB; an integration test confirms the audit trigger writes `consent_events` on grant/revoke and RLS denies cross-user access.'

issue "[A-4] Crash-free sessions ≥ 99.5% (alpha stabilization)" "Phase A: Honest & Bounded Alpha" \
  "phase:A,doctrine:D7,type:infra,area:mobile,priority:P0" \
  $'**Doctrine:** D7 (an unstable companion is harmful).\n**Acceptance:** Sentry/Crashlytics wired; crash-free > 99.5% over the alpha cohort; startup <3s, 60fps, mem <200MB; coverage ≥80% (CLAUDE.md gates). Maps to phaseGates.A_ALPHA[crashFreeSessions].'

issue "[A-5] \"Why did my Eidolon do that?\" provenance view" "Phase A: Honest & Bounded Alpha" \
  "phase:A,doctrine:D10,type:feat,area:mobile,priority:P1" \
  $'**Doctrine:** D10 (transparency), D6.\n**Acceptance:** for any overnight action, show a truthful explanation from personality + retrieved memories + active guardrail; disclose which model produced it (incl. fallback/template). Groundwork for the override-friction metric.'

issue "[A-6] Verified cross-store deletion (D9)" "Phase A: Honest & Bounded Alpha" \
  "phase:A,doctrine:D9,type:infra,area:backend,priority:P1" \
  $'Closes review finding R5.\n**Acceptance:** account deletion provably removes personality, all memories, reality data, consent rows & events, and chat across Firebase + Supabase + Cloudflare; integration test asserts zero residual rows.'

issue "[A-7] Alpha cohort test + power analysis" "Phase A: Honest & Bounded Alpha" \
  "phase:A,type:test,priority:P0" \
  $'Phase-A exit needs a real retention/trust signal.\n**Acceptance:** ≥ N testers complete the core loop ≥7 consecutive days; measure overnight override RATE *and* override FRICTION + declared trust (ONT-3). Replace the placeholder N=20 with a proper power analysis (self-audit owed item).'

issue "[A-0] Phase A exit checklist (tracking)" "Phase A: Honest & Bounded Alpha" \
  "phase:A,type:docs,area:governance,priority:P0" \
  $'Tracking issue. Phase A exits to Soft Launch when ALL hold (see docs/governance/phases/PHASE_A.md M-A1):\n- [ ] A-1 consent UI (OBL_CONSENT_UI)\n- [ ] A-2 guardrail UI (OBL_D6_GUARDRAILS_UI)\n- [ ] A-3 migrations applied\n- [ ] A-4 crash-free ≥99.5%\n- [ ] A-6 cross-store deletion verified\n- [ ] A-7 cohort signal\n- [x] D5 narrative-honesty validator (PR #110)\n- [x] D6 server guardrails + D4 consent gate (PR #110)\n\nProof path: `phaseAdvance(A_ALPHA) -> B_SOFT_LAUNCH` (soundness_check.ts test 3).'

issue "[C-1] Seat independent reviewer with binding flag-off power" "Phase C: Monetization On" \
  "phase:C,doctrine:D3,type:compliance,priority:P0" \
  $'Session-1 self-audit + Constitution §3/§6. MUST be done before monetization.\n**Acceptance:** ≥1 genuinely independent reviewer empowered to flag a feature OFF pending fix; named in CONSTITUTION.md.\n**Obligation:** OBL_INDEPENDENT_REVIEWER (blocks Phase C; enforced by INV_REVIEWER_BEFORE_MONETIZATION).'

issue "[C-2] Override-friction & declared-trust metrics" "Phase C: Monetization On" \
  "phase:C,doctrine:D2,type:infra,area:backend,priority:P1" \
  $'ONT-3 self-audit: a falling override rate is meaningless if overriding is hard.\n**Acceptance:** track override friction separately; dashboard flags falling override rate + falling declared trust as a RED flag.\n**Obligation:** OBL_OVERRIDE_FRICTION_METRIC (blocks Phase C).'

issue "[C-3] RevenueCat go-live + gacha drop-table audit (no power-for-pay)" "Phase C: Monetization On" \
  "phase:C,doctrine:D3,type:compliance,area:mobile,priority:P0" \
  $'**Doctrine:** D3 (money never buys power).\n**Acceptance:** every SKU & gacha drop is cosmetic/story/convenience only; an automated check keeps `powerForPaySkuCount === 0` (state invariant INV_NO_POWER_FOR_PAY).'

issue "[D-1] GDPR/APPI review of post-deletion social traces" "Phase D: Social Scale" \
  "phase:D,doctrine:D9,type:compliance,priority:P0" \
  $'ONT-5 / review R5 open question.\n**Acceptance:** legal review confirms anonymized social traces surviving deletion are not re-identifiable under GDPR/APPI; remediate if they are.\n**Obligation:** OBL_GDPR_SOCIAL_TRACES (blocks Phase D).'

# ── Optional: Projects v2 board ───────────────────────────────────────────────
if [[ "$BOARD" == "1" ]]; then
  say "Projects v2 board (owner: $BOARD_OWNER)"
  pnum=$(gh project create --owner "$BOARD_OWNER" --title "Eidolon Roadmap" --format json --jq '.number')
  echo "  + project #$pnum  (https://github.com/users/$BOARD_OWNER/projects/$pnum)"
  echo "  Linking open issues..."
  gh issue list --repo "$REPO" --state open --limit 100 --json url --jq '.[].url' | while read -r u; do
    gh project item-add "$pnum" --owner "$BOARD_OWNER" --url "$u" >/dev/null && echo "    · $u"
  done
  echo "  Tip: add a single-select 'Phase' field and group by it for a roadmap view."
fi

say "Done. Backlog created on $REPO."
