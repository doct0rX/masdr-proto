#!/usr/bin/env bash
# Reproducible golden run: submit the reference bucket hat and stream events.
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
curl -s -N -m 1200 "$BASE/api/jobs/$JOB/events" | tee "$OUT/events.log" | grep --line-buffered '"type":"stage"\|"type":"complete"\|"type":"failed"' | sed 's/^data: //'
PACK=$(grep -o '"packId":"[^"]*"' "$OUT/events.log" | tail -1 | cut -d'"' -f4)
if [ -n "$PACK" ]; then
  curl -s "$BASE/api/packs/$PACK" -o "$OUT/pack.json"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=en" -o "$OUT/techpack-en.pdf"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=ar" -o "$OUT/techpack-ar.pdf"
  curl -s "$BASE/api/packs/$PACK/export/pdf?lang=ar&mode=sample_room" -o "$OUT/sample-room-ar.pdf"
  curl -s "$BASE/api/packs/$PACK/export/xlsx?lang=en" -o "$OUT/techpack.xlsx"
  echo "pack $PACK exported to $OUT"; ls -la "$OUT"
fi
