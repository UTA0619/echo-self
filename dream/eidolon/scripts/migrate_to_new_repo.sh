#!/usr/bin/env bash
# Migrate Eidolon out of the nested home-dir repo (UTA0619/echo-self, under
# dream/eidolon/) into a clean, dedicated repo — e.g. super-uta/eidolon.
#
# Strategy: CLEAN SNAPSHOT of tracked files only (via `git archive`), so committed
# build junk / untracked artifacts (the dir is ~217M on disk vs ~378 tracked files)
# do NOT come along. Fresh history; the prior 9 interleaved commits are left behind
# in echo-self (PRs #109/#110 stay there for reference).
#
#   TARGET=super-uta/eidolon VISIBILITY=private ./scripts/migrate_to_new_repo.sh
#
# Requires: gh authenticated AS THE TARGET OWNER (e.g. `gh auth login` as super-uta)
# with `repo` scope. Run from anywhere inside the source repo.
set -euo pipefail

TARGET="${TARGET:?set TARGET=owner/repo, e.g. super-uta/eidolon}"
VISIBILITY="${VISIBILITY:-private}"
OWNER="${TARGET%%/*}"

SRC_ROOT=$(git rev-parse --show-toplevel)
PREFIX="dream/eidolon"           # where Eidolon lives inside the source repo
DEST=$(mktemp -d "/tmp/eidolon-migrate.XXXXXX")

echo "▶ Source repo: $SRC_ROOT  (prefix: $PREFIX)"
echo "▶ Target:      $TARGET ($VISIBILITY)"
echo "▶ Staging:     $DEST"

# Guard: the target owner must be authenticated.
if ! gh auth status 2>&1 | grep -q "account ${OWNER} "; then
  echo "✗ gh is not authenticated as '${OWNER}'. Run:  gh auth login   (as ${OWNER})" >&2
  exit 1
fi

# 1. Clean snapshot of tracked files only.
git -C "$SRC_ROOT" archive HEAD:"$PREFIX" | tar -x -C "$DEST"
echo "▶ Extracted $(find "$DEST" -type f | wc -l | tr -d ' ') tracked files"

# 2. Fresh git history in the staging dir.
git -C "$DEST" init -q -b main
git -C "$DEST" add -A
git -C "$DEST" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "chore: import Eidolon into dedicated repo

Clean snapshot from UTA0619/echo-self (dream/eidolon). Tracked files only;
build artifacts excluded. Governance system + Phase-A D4/D5/D6 enforcement included.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

# 3. Create the GitHub repo and push.
gh repo create "$TARGET" --"$VISIBILITY" --source="$DEST" --remote=origin --push

echo "✓ Migrated to https://github.com/$TARGET"
echo "  Next:  REPO=$TARGET BOARD=1 BOARD_OWNER=$OWNER ./scripts/setup_github_project.sh"
echo "  (run from a checkout of the new repo, or adjust the script path)"
echo "  Staging dir left at $DEST — remove when satisfied: rm -rf $DEST"
