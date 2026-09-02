# Masdr Tech Pack — AI Tech Pack Generator prototype

Solution plan and build instructions. Status: v1.0 (2026-09-02) — built and tested locally (see section 10); deployment pending the client-provided AWS deployer user.

## 1. Goal

A buyer uploads a product photo or sketch plus a short free-text description. The system returns a structured, factory-ready manufacturing tech pack, rendered in the browser and exportable as PDF, XLSX and JSON. Canonical test case: plain 100% cotton twill (~280 gsm) reversible bucket hat, two colorways (khaki outer / black reverse, black outer / khaki reverse), sizes S/M/L, single-row brim topstitch, first production run for a small Egyptian apparel brand.

Minimum output sections (from the brief): product description and intended use, bill of materials, measurement/spec chart across at least 3 sizes, construction/sewing notes, colorway breakdown. We exceed this with labels/packaging, QC/AQL, consumption math, assumptions and confidence flags, and a bilingual EN/AR layer.

## 2. What the research established

Full findings: `docs/research/research-findings.json` and `docs/research/research-summaries.txt`.

**Masdr (masdrmena.com).** Brand name "Masdr" (wordmark MASDR, Arabic مصدر), Cairo-based B2B marketplace positioned as Egypt's Alibaba-style platform, tagline "Unlock Egyptian Manufacturing". Buyer flow is Search → Chat & request quotes → Confirm production & ship. No tech-pack, sampling or AI feature exists today, so this slots in as the step before "request quotes". Visual identity is recoverable from the live site: indigo brand (#251670 logo, #301989 theme, #5F50BC primary, #362E83 CTA), cream page background #F8F6F1, blue-gray neutrals, heading text #232B32, pill buttons with purple glow, 8/12/16 px radii, Cairo font for Arabic, full RTL Arabic site. Badge colours: VERIFIED #0A9359, READY TO SHIP #0CA3C6, FLASH SALE #FF3000. Do not reuse the placeholder /about and /contact content on the live site.

**Tech pack standards.** Canonical order: cover/header → product description → technical flats with callouts → BOM → graded POM chart with tolerances → construction (ISO 4915 stitch, ISO 4916 seam, SPI, seam allowance, thread) → colorways / BOM-by-colour → labels, packaging, QC/AQL → revision log. Egypt's domestic market requires Arabic labels (fibre content, care per ES 1405/ISO 3758 symbols, country of origin, manufacturer) under the ES 7266 series.

**Reversible bucket hat construction.** Two complete self-fabric shells (each: 1 crown tip + 2 side-band panels + 2 half-annulus brim panels), joined right-sides-together at the brim outer edge, turned through a gap, closed by the single brim topstitch; no lining, no sweatband, eyelets optional. Sizing: head girth S 55–56 / M 57–58 / L 59–60 cm, finished inner circumference 57 / 59 / 61 cm (1 cm ease, 2 cm grade). Crown side height ~9 cm, brim 6.5 cm, tip diameter derived from tip circumference (inner circumference minus band taper) divided by π. Stitching: 301 lockstitch, 10–12 SPI seaming, 8 SPI topstitch, 1 cm seam allowance, Tex 27–30 core-spun polyester seaming, Tex 40 topstitch, needle Nm 80–90. Consumption about 0.20–0.22 m of each colour per hat at 150 cm width. Key insight: the two named colorways are physically the same hat; the pack must say so and differentiate them by brand-label side and hangtag.

**AI model.** Every frontier vendor supports vision plus strict JSON output, so choice is about vision quality, reliability and ergonomics. Recommendation: `claude-opus-5` as the primary model (vision observation at effort medium, generation at effort high), `claude-sonnet-5` as critic/repair and as fallback. Fable 5.1 is not recommended for this prototype (2× price, slower, refusal classifiers, forced tool choice rejected). Structured outputs via `output_config.format` with Zod. Verified locally: the supplied key lists Opus 5, Sonnet 5 and Fable 5.1, and a structured vision call on the reference image returned the correct product type, both colorways, the printed spec line and sensible construction cues.

**Competitors.** Photo-to-pack startups (The New Black, aitechpacks, Adstronaut, Genpire, Alibaba Accio) emit "plausible" measurements with disclaimers, PDF-only exports, no consumption math, no per-field confidence, no Arabic, and several exclude hats. Deriving geometry in code from head circumference, exposing formulas and confidence, bilingual output and PDF+XLSX+JSON are the differentiators.

**Hosting.** Best path given no local Docker daemon and an S3-only IAM user: one EC2 instance (t3.small or t4g.small) bootstrapped by cloud-init, Caddy for automatic TLS, SQLite + S3, SSM Session Manager instead of SSH, all in Terraform. One A record at GoDaddy. About $20/month. Lambda + Function URL + CloudFront is the zero-idle-cost alternative with more plumbing.

## 3. Architecture

```
Browser (Next.js, Masdr theme, EN/AR)
   │ upload photo + description
   ▼
POST /api/jobs  ──► job row (SQLite) ──► pipeline worker (in-process queue)
   │                                         │
   │ SSE /api/jobs/:id/events  ◄─────────────┤ stage progress
   ▼                                         ▼
GET /api/jobs/:id   ◄── techpack.json + pdf + xlsx in ./data or S3
```

### 3.1 Generation pipeline (prompt chaining with code gates)

| # | Stage | Kind | Model / effort | Output |
|---|-------|------|----------------|--------|
| 0 | Normalise input | code | sharp resize ≤1568 px, EXIF strip | image buffer + hash |
| 1 | Vision observation | LLM | Opus 5, medium | `VisionObservation`: product type, silhouette, panels, brim, stitch rows, colours, text in image, hardware, confidence per attribute |
| 2 | Merge + route | code | — | `ProductBrief`: observation ∪ user text (text wins on conflict, conflicts flagged) → template id (`bucket_hat`, generic fallback) |
| 3 | Draft generation | LLM | Opus 5, three parallel structured calls (high / medium / medium) | `TechPackDraft` for base size M only, in three parts (prose + sizes + base intent; BOM + construction; colorways + labels + packaging + QC + assumptions). One schema exceeded the API grammar limit, so the parts merge in code. Rulebook cached with `cache_control`. |
| 3b | Reconcile parts | LLM | Sonnet 5, low | Aligns colorways/labels/packaging with the BOM they could not see (refs, label sizes, thread specs); code then rewrites thread refs and derives BOM fabric quantity from the cut sheet |
| 4 | Derive geometry | code | — | Graded POM chart S/M/L from head circumference formulas; consumption per colour; colorway × BOM matrix; formula strings kept per value |
| 5 | Validate | code | — | Zod schema, business rules (monotonic grades, tip diameter vs circumference, tolerances present, every POM has a sketch anchor, no colour by name only) |
| 6 | Critique | LLM | Sonnet 5, low | `CritiqueReport`: factory-readiness score, missing/inconsistent items |
| 7 | Repair | LLM | Opus 5, medium | Only the parts an issue concerns are regenerated; ≤2 iterations, convergence guard keeps the best build, per-job cost cap; unresolved items become questions for the factory |
| 8 | Render | code | — | HTML (web + print CSS), parametric SVG flats, PDF via Playwright Chromium, XLSX via exceljs, JSON |

Every AI-inferred value carries provenance: `measured` (from image), `stated` (from user text), `derived` (formula), `default` (industry rulebook), each with a confidence level. The pack ends with an "Assumptions and questions for the factory" section.

### 3.2 Tech pack schema (outline)

`header` (style no., name, brand, season, version, date, base size, units) · `product` (description EN/AR, intended use, category, fit intent) · `flats` (SVG views with POM anchors) · `bom[]` (item, description, composition, weight, width, colour ref, placement, consumption/qty, supplier TBC, provenance) · `poms[]` (code, name EN/AR, how to measure, values per size, tolerance, derivation) · `construction` (stitch/seam standards, seam allowance, thread, needle, ops[] with machine/SPI) · `colorways[]` (name, per-component colour with Pantone TCX + hex, thread, label side) · `labels[]` · `packaging` · `qc` · `assumptions[]` · `revision_log[]`.

### 3.3 Parametric flats

One SVG template module per product type, starting with `bucket_hat`: side elevation, top plan, underside. Drawn from the M-size POM values in mm units so the drawing is consistent with the numbers by construction. Each POM is a `<g id="pom-A">` with a leader and badge; the same SVG renders on the web page, in the PDF and rasterised into the XLSX.

### 3.4 Bilingual layer

English primary with an Arabic gloss for every heading, POM name, BOM item and construction step; numbers, units and POM codes stay Latin. UI has an EN/AR toggle mirroring the live site (`dir="rtl"`, Cairo font). PDF keeps LTR page flow with isolated RTL spans.

## 4. Stack

- **App:** Next.js 16 (App Router, TypeScript), Tailwind v4 with Masdr tokens, Route Handlers for API + SSE.
- **AI:** `@anthropic-ai/sdk` 0.123, Zod `zodOutputFormat`, `messages.parse` for JSON stages, `messages.stream().finalMessage()` for the draft stage, `fallbacks: "default"` on Opus 5 calls, typed error handling.
- **Data:** SQLite (better-sqlite3) for jobs and packs; files on local disk in dev, S3 in prod.
- **Exports:** Playwright + Chromium (print CSS → A4 PDF, Arabic shaping correct), exceljs (POM sheet with grade formulas, BOM, colorways, revision log), JSON.
- **Images:** sharp.
- **Tests:** Vitest for geometry/validators/rulebook; one golden run on the bucket hat fixture; Playwright smoke test of the UI.
- **Infra:** Terraform 1.15, EC2 + Caddy + systemd + cloud-init, SSM Parameter Store for the API key, S3 bucket for uploads/packs/releases, deploy via zip → S3 → SSM RunCommand (no Docker, no SSH).

## 5. Repository layout

```
prototype/
  docs/            PLAN.md, research/, DEPLOY.md (runbook), EVAL.md (test-case results)
  app/             Next.js app (src/app, src/components, src/lib)
    src/lib/ai/    anthropic client, prompts, schemas, stages
    src/lib/rulebook/  bucket_hat.ts (numbers + formulas), generic.ts
    src/lib/geometry/  derive.ts (POM grading, consumption), validators.ts
    src/lib/flats/     bucket_hat.svg.ts (parametric views)
    src/lib/export/    pdf.ts, xlsx.ts
    src/lib/jobs/      sqlite store, queue, sse
    fixtures/          masdr_bucket_hat.png, expected output
  infra/           terraform/, cloud-init.yaml, Caddyfile
```

## 6. Build phases and acceptance criteria

1. **Foundation** — repo, Next.js app, Masdr theme tokens, upload form, job store, SSE. Accept: upload → job created → progress events stream.
2. **Rulebook + geometry** — bucket hat rulebook with formulas, grading, consumption, validators, unit tests. Accept: S/M/L chart derived from 57/59/61 cm passes all rules.
3. **AI pipeline** — vision, draft, critique, repair with Zod schemas and provenance. Accept: golden run on the reference image produces a complete pack in under ~90 s with zero validator failures.
4. **Rendering + exports** — HTML pack view, parametric flats, PDF, XLSX, JSON, EN/AR toggle. Accept: PDF opens with Arabic shaped correctly; XLSX POM sheet regrades S/L when M is edited.
5. **Editing + factory handoff** — inline edits, regenerate section, revision log, "Send to verified factories" CTA (mocked), factory-readiness checklist score.
6. **Hardening** — error states, refusal/fallback handling, rate-limit retries, cost logging per stage, EVAL.md with the canonical output.
7. **Deploy** — Terraform apply, GoDaddy A record, TLS, smoke test on https://masdr-proto.thegentek.com. Last step, only after local acceptance.

## 7. Deployment runbook (summary; full detail in DEPLOY.md once approved)

1. Account admin creates IAM user or role `masdr-proto-deployer` with EC2, IAM (role/instance-profile), SSM, S3 and ACM-free permissions listed in DEPLOY.md; `aws configure --profile masdr`.
2. `terraform apply -target=aws_eip.app` → note the Elastic IP.
3. Create GoDaddy A record `masdr-proto` → EIP, TTL 600 (UI or GoDaddy API).
4. Upload first release zip to S3, `terraform apply` (full). cloud-init installs Node 22, Chromium deps, Caddy, systemd unit; Caddy obtains the certificate automatically once DNS resolves.
5. Verify with `dig`, `curl -I`, and SSM session logs.
6. Redeploy loop: `zip → aws s3 cp → aws ssm send-command masdr-deploy`.

## 8. Risks and mitigations

- **Numbers hallucinated by the model** → all graded measurements and consumption are computed in code from the rulebook; the model only proposes base-size intent and prose.
- **Session/API limits during demo** → cost logging, prompt caching, Sonnet 5 fallback, retries with backoff; run 20 warm-up generations before the demo.
- **Arabic rendering in PDF** → Chromium rendering with bundled Cairo/Noto fonts; no fetch at render time.
- **Colorway ambiguity (same physical hat)** → explicit note in the pack and a decision field (one SKU with label-side designation vs two SKUs).
- **AWS permissions** → current identity is S3-only; deployment is blocked until a deployer identity exists (decision 9.1).

## 9. Client decisions (confirmed 2026-09-02)

1. **AWS access.** Client creates a dedicated deployer IAM user; I run Terraform end to end. Region: **eu-west-1 (Ireland)**.
2. **DNS.** Client adds the A record manually at GoDaddy; I supply host, value and TTL once the Elastic IP exists.
3. **Branding.** Native Masdr feature look: "Masdr Tech Pack", MASDR text wordmark, site palette, badge colours, pill buttons, EN/AR locale pill.
4. **Exports and language.** PDF + XLSX + JSON, English primary with Arabic gloss, AR/EN UI toggle.
5. **Colorways (default, not yet confirmed).** One style with two colorway lines differentiated by label side and hangtag; the pack flags that both colorways are the same physical hat.
6. **Model (default).** `claude-opus-5` primary, `claude-sonnet-5` critic/fallback; `ANTHROPIC_MODEL_PRIMARY` env var allows an A/B with `claude-fable-5-1`.
7. **Access gating (default).** Optional shared access code via `ACCESS_CODE` env var; unset means open.
8. **Anthropic key.** The key present in the shell environment is used for local testing; production key goes into SSM Parameter Store. Confirm the org has purchased credits before the demo.

## 10. What was built (2026-09-02)

- `app/` Next.js 16 application: upload form, SSE progress, pack viewer with base-size editing (S/L regrade), EN/AR toggle, exports (PDF, Excel, JSON, Arabic sample-room sheet), mocked "send to verified factories", optional access code gate.
- Pipeline 0.4.0 as in section 3 with two changes learned in testing: the draft runs as three parallel structured calls (grammar-size limit), and the critic's "blocking" definition excludes prerequisites that need physical action, which had caused the repair loop to churn.
- Bucket-hat rulebook reconciled from a three-technologist panel plus web verification (`docs/research/rulebook-reconciled.json`): 30° cone brim (F = A + 2π·C·cos30°), Tex 30 seaming / Tex 40 topstitch, labels sewn flat 1.5 cm below the tip seam before side seams, 8 cm turning gap, allowance trimmed to 0.7 cm, full-round stitch-in-ditch, no topstitch on internal seams, SAM ≈ 13.5 min sewing.
- Architecture judge panel (three designs, three judges) chose the demo-impact-first design and its grafts were applied: factory acknowledgement page, Arabic sample-room export, fixed colour dictionary, prose-vs-POM cross-check, repair convergence guard, cost cap, immutable pack versions.
- Tests: 12 unit tests (geometry, validators, flats, edit regrade); golden run results in `docs/EVAL.md` and `docs/eval/`.
- Infra: Terraform for eu-west-1, cloud-init with Caddy + systemd, deploy scripts; runbook in `docs/DEPLOY.md`. Production build verified locally (standalone bundle, Playwright/sharp/exceljs traced).
