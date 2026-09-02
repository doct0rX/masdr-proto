Subject: Re: AI Tech Pack Generator — working demo, source and notes

Hi Farida,

Thanks for the challenge. Here are the three deliverables.

**1. Working demo**
Live: https://masdr-proto.thegentek.com (access code: khaki-delta-954)
Click "Use the bucket hat example" and "Generate tech pack" to watch a fresh run (about five minutes, progress streams live), or open "My tech packs" for the canonical bucket-hat pack already generated. The pack is editable in the browser (change the base size and S/L regrade), exports to PDF, Excel and JSON, and has an English/Arabic toggle plus an Arabic-first sample-room sheet. Local run instructions are in the README.

**2. Source**
https://github.com/doct0rX/masdr-proto (Next.js 16, TypeScript; Terraform for the AWS deployment; docs/ has the plan, evaluation and deploy runbook.)

**3. Approach, models, and what I'd build next**

Approach. I treated this as a factory document problem, not a text-generation problem. The model is only allowed to decide what it can actually see or reason about; every number a factory would cut from is computed in code. The pipeline is: (1) a vision pass reads the photo or sketch into a structured observation with per-attribute confidence; (2) the product is routed to a template (bucket hat has a code-derived geometry template, other families fall back to a generic path); (3) three parallel drafting calls write the prose, BOM/construction and colorways/labels/QC against a headwear rulebook I compiled from industry practice (EN 13402 head girth, ISO 4915/4916, ES 7266 labelling); (4) code derives the graded spec chart from head circumference (2 cm grade, tip diameter from circumference, 30° cone brim), the pattern cut sheet, fabric consumption with the formulas printed, and dimension-true SVG flats with POM callouts; (5) validators check grading, geometry consistency, cross-references and completeness; (6) a "factory production manager" review pass scores the pack and triggers at most two targeted repairs, and anything still open becomes an explicit question for the factory. Every BOM line and measurement carries provenance (measured from image, stated by buyer, derived by formula, industry default) so the factory knows what to trust.

Assumptions I made and noted in the pack: reversible means two complete self-fabric shells with no lining; the two named colorways are physically the same hat, so it is one style with two colorway codes distinguished by brand-label side and hangtag; S/M/L fit 55–56/57–58/59–60 cm heads with 1 cm ease; 280 gsm cotton twill, single 6 mm brim topstitch; Egyptian domestic market, so the care label is bilingual and follows ES 7266.

Models and tools. Claude Opus 5 for the vision read and the drafting (best image understanding and reliable JSON-schema output for a document this large), Claude Sonnet 5 for the cross-check and review passes (fast and cheap where judgment, not writing, is needed), both through Anthropic's structured outputs with Zod schemas and prompt caching on the rulebook. Playwright/Chromium renders the PDFs so Arabic shapes correctly; exceljs builds the Excel with regrade formulas. A run costs about $1.20 and takes about five minutes. Hosting is one EC2 instance in eu-west-1 behind Caddy, provisioned with Terraform, secrets in SSM Parameter Store. The build itself was done with an agentic coding workflow with generated unit tests and human review.

With another week I would: (a) add a template registry so caps, tees, hoodies and bags get the same code-derived geometry and parametric flats; (b) close the loop with the factory: sample comments against POMs, revision history, acknowledgement and a handoff into Masdr's chat/RFQ so a buyer goes from sketch to quotes without leaving the platform; (c) run the output past two or three Egyptian sample rooms and tune the rulebook and Arabic terminology from their feedback; (d) accept multiple photos and hand sketches, and add a costing sheet (fabric, CMT, packaging in EGP) fed by factory rate cards; (e) product hardening: accounts and per-brand workspaces, and in-region hosting on Bedrock if data residency matters.

Happy to walk through it live whenever suits you.

Best,
Mustafa
