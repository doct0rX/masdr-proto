# Masdr Tech Pack — AI Tech Pack Generator (prototype)

Upload a product photo or sketch plus a one-line description; get a factory-ready, bilingual (EN/AR) manufacturing tech pack with a graded spec chart, BOM, operation sheet, colorways, labels, packaging, QC, consumption math, provenance flags, and PDF / Excel / JSON exports. Built for masdrmena.com's buyer flow as the step before "request quotes".

Canonical test case: reversible 280 gsm cotton twill bucket hat, khaki/black, S/M/L, single-row brim topstitch.

## Layout

```
app/       Next.js 16 application (TypeScript, Tailwind v4, Anthropic SDK, Playwright, exceljs, SQLite)
docs/      PLAN.md (architecture + decisions), DEPLOY.md (AWS runbook), EVAL.md (golden run results), research/
infra/     Terraform (eu-west-1), cloud-init, Caddy, deploy scripts
environment.yml   conda environment (masdr-proto) for project tooling
```

## Run locally

```bash
cd app
cp .env.example .env.local        # set ANTHROPIC_API_KEY
pnpm install
pnpm exec playwright install chromium
pnpm dev                          # http://localhost:3000 (development)
scripts/prod.sh                   # or: build + run the production server under a restart loop
```

If your Anthropic key is identity-linked, also set `ANTHROPIC_WORKSPACE_ID` in `.env.local`.

Click "Use the bucket hat example" on the home page, then "Generate tech pack". A run takes about 5 minutes and costs about $1.20 in API usage (see docs/EVAL.md).

## Test

```bash
cd app
pnpm exec vitest run              # geometry, validators, flats
pnpm exec tsc --noEmit && pnpm exec eslint src
```

## How it works

1. **Vision** (`claude-opus-5`, structured output): what is observable in the image, with per-attribute confidence.
2. **Route**: product family → template (`bucket_hat` has code-derived geometry; other families use a generic path).
3. **Draft** (three parallel structured calls on Opus 5 sharing a cached rulebook prompt): prose, BOM, construction, colorways, labels, packaging, QC, assumptions, questions, and the base-size intent.
4. **Derive in code**: every graded measurement from head circumference (2 cm grade), tip diameter from circumference, cone-brim outer edge, pattern piece dimensions, fabric consumption with formulas, dimension-true SVG flats with POM callouts.
5. **Validate**: monotonic grading, geometry consistency, BOM/thread/label completeness, prose-vs-POM cross-checks, colour references.
6. **Critique** (`claude-sonnet-5`, factory production-manager persona) → bounded **repair** loop with a convergence guard and cost cap; anything unresolved becomes an explicit question for the factory.
7. **Render**: web view (editable, base-size edits regrade S/L), A4 PDF via headless Chromium (Arabic shaped correctly), Excel with regrade formulas, JSON, and an Arabic-first sample-room sheet.

See `docs/PLAN.md` for the full design and `docs/DEPLOY.md` for hosting at https://masdr-proto.thegentek.com.
