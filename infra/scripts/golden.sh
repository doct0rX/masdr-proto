#!/usr/bin/env bash
# Reproducible golden run: submit the reference bucket hat, poll until done, export.
# Usage: scripts/golden.sh [base_url] [out_dir]
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"
OUT="${2:-./data/golden}"
mkdir -p "$OUT"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$HERE/public/examples/masdr_bucket_hat.png"
DESC="Plain cotton twill bucket hat (~280 gsm), reversible, two colorways: khaki outer / black reverse and black outer / khaki reverse. Sizes S/M/L. Single-row brim topstitch. First production run for a small Egyptian apparel brand."
curl -s -o "$OUT/post.json" -w "POST %{http_code}\n" -X POST "$BASE/api/jobs" \
  -F "image=@$IMG;type=image/png" -F "description=$DESC" -F "brand=Nile Thread Co." \
  -F "season=SS27" -F "runQuantity=300" -F "targetMarket=Egypt (domestic)"
JOB=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT/post.json','utf8')).jobId)")
echo "job $JOB"
LAST=""
for i in $(seq 1 180); do
  sleep 10
  curl -s -m 15 "$BASE/api/jobs/$JOB" -o "$OUT/job.json" || { echo "poll failed"; continue; }
  STATUS=$(node -e "const j=JSON.parse(require('fs').readFileSync('$OUT/job.json','utf8'));console.log(j.job.status+' '+(j.job.stage||''))")
  [ "$STATUS" != "$LAST" ] && echo "$(date +%H:%M:%S) $STATUS" && LAST="$STATUS"
  case "$STATUS" in complete*|failed*) break;; esac
done
node -e "const j=JSON.parse(require('fs').readFileSync('$OUT/job.json','utf8'));for(const e of j.events){if(e.type==='stage'&&e.status==='done')console.log('  '+e.stage.padEnd(20)+(e.ms/1000).toFixed(1)+'s  \$'+(e.cost_usd||0).toFixed(3))};if(j.job.error)console.log('ERROR',j.job.error)"
PACK=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT/job.json','utf8')).job.pack_id||'')")
if [ -n "$PACK" ]; then
  curl -s "$BASE/api/packs/$PACK" -o "$OUT/pack.json"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=en" -o "$OUT/techpack-en.pdf"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=ar" -o "$OUT/techpack-ar.pdf"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=ar&mode=sample_room" -o "$OUT/sample-room-ar.pdf"
  curl -s "$BASE/api/packs/$PACK/export/xlsx?lang=en" -o "$OUT/techpack.xlsx"
  echo "pack $PACK exported to $OUT"; ls -la "$OUT"
fi
