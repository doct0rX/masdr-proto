# Evaluation — canonical bucket hat test case

Input: `masdr_bucket_hat.png` (the supplied reference flat) plus the description "Plain cotton twill bucket hat (~280 gsm), reversible, two colorways: khaki outer / black reverse and black outer / khaki reverse. Sizes S/M/L. Single-row brim topstitch. First production run for a small Egyptian apparel brand." Brand "Nile Thread Co.", season SS27, run quantity 300, market Egypt (domestic).

Artefacts from the final run on 2026-09-02 (pipeline 0.4.0, `claude-opus-5` + `claude-sonnet-5`), all in `docs/eval/`: `golden-bucket-hat.json`, `-en.pdf` (full pack, 28 pages), `-ar.pdf` (Arabic-primary, 27 pages), `-sample-room-ar.pdf` (flats, POM chart, cut sheet, op sheet, acknowledgement, 9 pages), `.xlsx` (9 sheets, POM sheet regrades S/L from M by formula).

## Pipeline metrics (final run)

| Stage | Model | Time | Cost |
|-------|-------|------|------|
| Vision observation | Opus 5, effort medium | 21 s | $0.044 |
| Draft (3 parallel parts) | Opus 5, high / medium / medium | 158 s | $0.942 |
| Reconcile parts | Sonnet 5, effort low | 101 s | $0.157 |
| Assemble + derive + validate | code | 2 ms | — |
| Factory critique | Sonnet 5, effort low | 23 s | $0.076 |
| Repair | — | not needed | — |
| **Total** | | **303 s** | **$1.22** |

Result: validator 0 errors, 1 informational warning (optional interfacing listed at zero quantity), readiness checklist 15/15 = 100, critic score 88 with verdict *pass*; the critic's five remaining items are warnings (lab dips, AQL sample-size wording, seam allowance wording on the brim curve) and no repair pass was triggered.

Earlier iterations on the same input, for comparison: the first build spent $3.62 / 710 s because the critic treated prerequisites (lab dips, buyer confirmations) as blocking and the repair loop churned; tightening the critic's severity rules, running repairs only on the parts an issue concerns, adding the reconcile pass and fixing cross-part references in code brought this to $1.22 / 303 s with a higher-quality result.

## Output coverage against the brief

| Requirement | Delivered |
|-------------|-----------|
| Product description and intended use | EN + AR description, intended use, fit intent, key features, observations from the reference |
| Bill of materials | 15 lines: 2 fabrics (buying qty 0.19 m/hat each, derived from the cut sheet), optional interfacing, 4 threads (Tex 30 seaming, Tex 40 topstitch, per colour), 3 labels, hangtag string, 4 packaging items; composition, gsm, width, placement, qty/unit, colour rule, supplier "TBC by factory", provenance and confidence per line |
| Measurement/spec chart, 3+ sizes | 10 POMs × S/M/L with tolerances, how-to-measure in EN and AR, and the formula for every value |
| Construction/sewing notes | Standards block (301, SSa-1, SPI, SA, needle, thread, interfacing, pressing) + 12-step operation sheet with machine, stitch, SPI and Arabic operation names; SAM estimate 13.5 min sewing |
| Colorway breakdown | 2 colorways × 7 coloured components with Pantone TCX + hex and BOM refs (F1/F2 shells, T3/T4 topstitch threads, L1–L3 labels), needle/bobbin thread rule, brand-label side; explicit note that both colorways are the same physical hat |
| Beyond the brief | Dimension-true technical flats (side, top, underside) with POM callouts; pattern-piece cut sheet; fabric consumption with formulas and run totals (57 m per colour for 300 pcs); labels incl. ES 7266 bilingual care label; packaging; QC with AQL and lab tests; 9 assumptions with impact; 8 questions for the factory; factory acknowledgement page; readiness score; revision log; PDF/XLSX/JSON exports; Arabic sample-room sheet |

## Spec chart produced (finished cm, base M)

| POM | S | M | L | Tol | Derivation |
|-----|---|---|---|-----|------------|
| A Inner head circumference | 57.0 | 59.0 | 61.0 | ±1.0 | head girth max + 1 cm ease, grade 2 cm |
| B Crown side height | 8.5 | 9.0 | 9.5 | ±0.5 | 9.0 at M, grade 0.5 |
| C Brim width | 6.5 | 6.5 | 6.5 | ±0.3 | constant |
| H Crown tip circumference | 54.5 | 56.5 | 58.5 | ±1.0 | A − 2.5 cm taper |
| D Crown tip diameter | 17.3 | 18.0 | 18.6 | ±0.3 | H / π |
| E Total height flat | 15.0 | 15.5 | 16.0 | ±0.7 | B + C |
| F Brim outer edge circumference | 92.4 | 94.4 | 96.4 | ±1.5 | A + 2π·C·cos30° (30° cone brim) |
| W Full width on head form | 29.4 | 30.0 | 30.7 | ±1.0 | A/π + 2·C·cos30° |
| G Brim topstitch from edge | 0.6 | 0.6 | 0.6 | ±0.1 | from brief |
| J Brand label below tip seam | 1.5 | 1.5 | 1.5 | ±0.3 | constant |

Consumption: 0.17 m per hat per colour for planning, 0.19 m buying (rounded up, +10% allowance) at 147 cm usable width, 70% marker efficiency, 3% shrinkage; 47 g of fabric per shell; 57 m per colour for the 300-piece run.

## Quality checks

- Unit tests (12): grading, tip-diameter/circumference consistency, cone-brim formula, monotonic grades, consumption bounds, flats anchor every POM, operation sheet completeness, validator accepts/rejects correctly, base-size edit regrades S/L while preserving the crown taper.
- Edit endpoint exercised on a generated pack: A(M) 59→60 regraded S/L to 58/62, recomputed dependent POMs and flats, bumped the version to 1.1 with a revision-log entry, readiness stayed 100.
- Access-code gate exercised on the production bundle: 307 redirect without cookie, 401 on API, 401 on wrong code, 200 after the correct code.
- Production standalone build verified locally; the release bundle contains no env files (secrets come from SSM at runtime).
- Exports open correctly and Arabic is shaped correctly in the PDFs (rendered by headless Chromium).

## Production-build end-to-end run (2026-09-02, evening)

Same input, run against the built standalone server (`app/scripts/prod.sh`) with the redesigned UI: readiness 100/100, 0 validator errors, critic 88 pass, 495 s and $2.32 (one repair pass was triggered and then discarded by the convergence guard). Live progress page, PDF (EN 29 pages, AR 29 pages), Arabic sample-room sheet (10 pages), Excel and JSON exports all verified on the production build. This run also surfaced and fixed a packaging bug: output-file tracing omitted Playwright's `browsers.json`, so the build scripts now copy the full Playwright packages into the bundle.

## Known limitations

- Only the bucket-hat family has code-derived geometry and parametric flats; other families use model-proposed POMs with a linear grade and no flats.
- Generation takes about 5 minutes; the UI streams progress, but a live demo should pre-generate the canonical pack (already stored) and show a fresh run in parallel.
- Thread and label quantities per hat are model estimates (provenance "derived"/"inferred"), not marker-based; fabric quantities are computed.
- Colour references come from a fixed dictionary for khaki, black and white; other colours are the model's nearest Pantone TCX guess, flagged with confidence.
