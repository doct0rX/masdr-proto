#!/usr/bin/env bash
# Build and run the production (standalone) server locally under a restart loop.
# Usage: scripts/prod.sh [port]   — stops any dev server on the port first.
set -euo pipefail
PORT="${1:-3000}"
cd "$(dirname "$0")/.."
LOG="${LOG:-/tmp/masdr-prod.log}"
# stop whatever holds the port (dev server or an older prod server) and its supervisor loop
pkill -f "masdr-dev-supervisor" 2>/dev/null || true
pkill -f "masdr-prod-supervisor" 2>/dev/null || true
PID=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)
[ -n "${PID:-}" ] && kill "$PID" 2>/dev/null || true
sleep 2
pnpm exec next build
/bin/rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
/bin/rm -f .next/standalone/.env .next/standalone/.env.*
# Playwright loads files (browsers.json, lib/server/*) that output-file tracing misses: ship the full packages.
for pkg in node_modules/.pnpm/playwright-core@* node_modules/.pnpm/playwright@*; do
  mkdir -p ".next/standalone/$pkg"
  cp -r "$pkg/." ".next/standalone/$pkg/"
done
# env from .env.local (never copied into the bundle)
set -a; [ -f .env.local ] && . ./.env.local; set +a
export PORT HOSTNAME=127.0.0.1 NODE_ENV=production INTERNAL_BASE_URL="http://127.0.0.1:$PORT"
setsid bash -c "exec -a masdr-prod-supervisor bash -c 'while true; do node .next/standalone/server.js >> $LOG 2>&1; echo \"[supervisor] server exited \$?; restarting\" >> $LOG; sleep 2; done'" < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do sleep 1; curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && echo "production server healthy on http://localhost:$PORT" && exit 0; done
echo "server did not become healthy; see $LOG"; tail -20 "$LOG"; exit 1
