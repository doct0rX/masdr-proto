#!/usr/bin/env bash
# Build the Next.js standalone bundle locally (no Docker needed) and zip it.
set -euo pipefail
cd "$(dirname "$0")/../../app"
pnpm install --frozen-lockfile
pnpm exec next build
# Playwright loads files (browsers.json, lib/server/*) that output-file tracing misses: ship the full packages.
for pkg in node_modules/.pnpm/playwright-core@* node_modules/.pnpm/playwright@*; do
  mkdir -p ".next/standalone/$pkg"
  cp -r "$pkg/." ".next/standalone/$pkg/"
done
OUT=../infra/dist
/bin/rm -rf "$OUT" && mkdir -p "$OUT"
cp -r .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next/static" "$OUT/public"
cp -r .next/static/. "$OUT/.next/static/"
cp -r public/. "$OUT/public/"
/bin/rm -f "$OUT"/.env "$OUT"/.env.* "$OUT"/.env*.local   # secrets never ship in the bundle; they come from SSM
( cd "$OUT" && zip -qr ../release.zip . )
echo "release: $(du -h ../infra/release.zip | cut -f1) at infra/release.zip"
