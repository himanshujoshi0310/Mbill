#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEXT_BIN="$PROJECT_ROOT/node_modules/.bin/next"
LOCK_FILE="$PROJECT_ROOT/.next/dev/lock"
PROCESS_PATTERN="$PROJECT_ROOT/node_modules/.bin/next dev"

if [[ ! -x "$NEXT_BIN" ]]; then
  echo "next binary not found. Run: npm install"
  exit 1
fi

# Stop leftover next dev processes for this project (including suspended/stuck ones).
PIDS="$(pgrep -f "$PROCESS_PATTERN" || true)"
if [[ -n "$PIDS" ]]; then
  echo "Stopping stale Next.js dev process(es): $PIDS"
  # shellcheck disable=SC2086
  kill -TERM $PIDS || true
  sleep 1

  for pid in $PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" || true
    fi
  done
fi

# Remove stale lock if present.
if [[ -f "$LOCK_FILE" ]]; then
  rm -f "$LOCK_FILE"
fi

exec "$NEXT_BIN" dev --turbopack "$@"
