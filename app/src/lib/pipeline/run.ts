import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
import { getJob, updateJob, savePack } from "@/lib/jobs/store";
import { emit } from "@/lib/jobs/events";
import { visionStage, draftStage, critiqueStage, repairStage, reconcileStage, type GenerationOptions, type StageResult } from "@/lib/ai/stages";
import type { VisionObservation, TechPackDraft, CritiqueOutput } from "@/lib/ai/llm-schemas";
import { MODELS } from "@/lib/ai/client";
import { assembleTechPack, type AssembleInput } from "./assemble";
import { validateTechPack, readinessChecklist } from "@/lib/techpack/validate";
import { TechPack } from "@/lib/techpack/schema";
import { PIPELINE_VERSION } from "./version";
import type { z } from "zod";

const MAX_REPAIRS = 2;
const MAX_COST_USD = Number(process.env.MAX_COST_PER_JOB_USD ?? 2.5);

export { PIPELINE_VERSION };

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function decideTemplate(obs: VisionObservation, description: string): string {
  if (obs.product_family === "bucket_hat" || /bucket\s*-?\s*hat/i.test(description)) return "bucket_hat";
  return "generic";
}

type StageRec = z.infer<typeof TechPack>["pipeline"]["stages"][number];

export async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;
  const options = JSON.parse(job.options_json) as GenerationOptions;
  const stages: StageRec[] = [];
  const t0 = Date.now();
  let totalCost = 0;

  const record = (name: string, kind: "llm" | "code", r: { model?: string; ms: number; usage?: StageResult<unknown>["usage"]; note?: string }) => {
    const rec: StageRec = {
      name,
      kind,
      model: r.model ?? null,
      ms: r.ms,
      input_tokens: r.usage?.input_tokens ?? null,
      output_tokens: r.usage?.output_tokens ?? null,
      cache_read_tokens: r.usage?.cache_read_tokens ?? null,
      cost_usd: r.usage?.cost_usd ?? null,
      note: r.note ?? null,
    };
    stages.push(rec);
    if (r.usage) totalCost += r.usage.cost_usd;
    emit(jobId, { type: "stage", stage: name, status: "done", ms: r.ms });
  };

  try {
    updateJob(jobId, { status: "running", stage: "normalize" });

    // 0. Normalise image
    emit(jobId, { type: "stage", stage: "normalize", status: "start", message: "Preparing reference image" });
    let s = Date.now();
    const raw = fs.readFileSync(job.image_path);
    const jpeg = await sharp(raw).rotate().flatten({ background: "#ffffff" }).resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    record("normalize", "code", { ms: Date.now() - s, note: `${raw.length} → ${jpeg.length} bytes` });

    // 1. Vision observation
    updateJob(jobId, { stage: "vision" });
    emit(jobId, { type: "stage", stage: "vision", status: "start", message: "Reading the reference image: product type, panels, seams, brim and colours" });
    const vision = await visionStage({ base64: jpeg.toString("base64"), mediaType: "image/jpeg" }, job.description);
    record("vision", "llm", vision);
    emit(jobId, { type: "progress", percent: 20, message: `Identified: ${vision.data.product_type}` });

    // 2. Route
    const templateId = decideTemplate(vision.data, job.description);
    s = Date.now();
    record("route", "code", { ms: Date.now() - s, note: `template=${templateId}` });

    // 3. Draft
    updateJob(jobId, { stage: "draft" });
    emit(jobId, { type: "stage", stage: "draft", status: "start", message: "Writing the draft: description, materials, construction, colorways, labels and packaging" });
    let chars = 0;
    const onText = (delta: string) => {
      chars += delta.length;
      if (chars % 1200 < delta.length) emit(jobId, { type: "text", stage: "draft", delta: `${chars} characters written` });
    };
    let draft = await draftStage({ observation: vision.data, description: job.description, templateId, options }, onText);
    record("draft", "llm", draft);
    emit(jobId, { type: "progress", percent: 55, message: "Draft complete" });

    // 3b. Reconcile the parallel parts (colorways/labels vs BOM) with the fast model
    updateJob(jobId, { stage: "reconcile" });
    emit(jobId, { type: "stage", stage: "reconcile", status: "start", message: "Cross-checking materials, colorways and labels against each other" });
    try {
      const reconciled = await reconcileStage(draft.data);
      record("reconcile", "llm", reconciled);
      draft = reconciled;
    } catch (err) {
      record("reconcile", "llm", { model: MODELS.fast, ms: 0, note: `skipped: ${(err as Error).message}` });
    }
    emit(jobId, { type: "progress", percent: 60, message: "Deriving measurements, cut sheet, consumption and sketches" });

    // 4–5. Assemble + validate
    const packId = newId("tp");
    const build = (d: TechPackDraft) => {
      const st = Date.now();
      const input: AssembleInput = { packId, jobId, draft: d, observation: vision.data, templateId, options, description: job.description };
      const partial = assembleTechPack(input);
      const validation = validateTechPack(partial);
      record("assemble+validate", "code", { ms: Date.now() - st, note: `${validation.errors.length} errors, ${validation.warnings.length} warnings` });
      return { partial, validation };
    };
    let built = build(draft.data);

    // 6. Critique
    updateJob(jobId, { stage: "critique" });
    emit(jobId, { type: "stage", stage: "critique", status: "start", message: "Reviewing the pack the way a factory production manager would" });
    const forReview = { ...built.partial, flats: built.partial.flats.map((f) => ({ id: f.id, pom_codes: f.pom_codes })), validation: built.validation };
    let critique: StageResult<CritiqueOutput> | null = null;
    try {
      critique = await critiqueStage(forReview);
      record("critique", "llm", critique);
    } catch (err) {
      record("critique", "llm", { model: MODELS.fast, ms: 0, note: `skipped: ${(err as Error).message}` });
    }

    // 7. Repair loop with convergence guard: keep the best build, stop when it stops improving
    let repairs = 0;
    let best = built;
    let bestScore = built.validation.errors.length + (critique?.data.issues.filter((i) => i.severity === "blocking").length ?? 0);
    while (repairs < MAX_REPAIRS) {
      const blocking = (critique?.data.issues ?? []).filter((i) => i.severity === "blocking");
      const codeErrors = built.validation.errors.map((e) => ({ section: "validation", issue: e, fix: "Correct the value so the rule passes", severity: "blocking" as const }));
      const issues = [...blocking, ...codeErrors];
      if (issues.length === 0) break;
      if (totalCost > MAX_COST_USD) {
        record("cost-cap", "code", { ms: 0, note: `stopped repairs at $${totalCost.toFixed(2)} (cap $${MAX_COST_USD})` });
        break;
      }
      repairs++;
      updateJob(jobId, { stage: `repair-${repairs}` });
      emit(jobId, { type: "stage", stage: `repair-${repairs}`, status: "start", message: `Fixing ${issues.length} issue(s) found in review` });
      const repaired = await repairStage(draft.data, issues);
      record(`repair-${repairs}`, "llm", repaired);
      const candidate = build(repaired.data);
      let candidateCritique: StageResult<CritiqueOutput> | null = null;
      if (candidate.validation.errors.length === 0 || repairs < MAX_REPAIRS) {
        try {
          candidateCritique = await critiqueStage({ ...candidate.partial, flats: [], validation: candidate.validation });
          record(`critique-${repairs + 1}`, "llm", candidateCritique);
        } catch {
          candidateCritique = null;
        }
      }
      const score = candidate.validation.errors.length + (candidateCritique?.data.issues.filter((i) => i.severity === "blocking").length ?? 0);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
        built = candidate;
        draft = repaired;
        critique = candidateCritique ?? critique;
        if (score === 0) break;
      } else {
        record("repair-guard", "code", { ms: 0, note: `repair ${repairs} did not improve (score ${score} vs ${bestScore}); keeping previous build` });
        break;
      }
    }
    built = best;
    // Anything still unresolved becomes an explicit question for the factory rather than a hidden flag
    const unresolved = [...(critique?.data.issues ?? []).filter((i) => i.severity === "blocking"), ...built.validation.errors.map((e) => ({ section: "validation", issue: e, fix: "", severity: "blocking" as const }))];
    const seen = new Set<string>();
    for (const u of unresolved) {
      const key = u.issue.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      built.partial.questions_for_factory.push({ text_en: `Unresolved after automated review (${u.section}): ${u.issue}${u.fix ? ` — proposed: ${u.fix}` : ""}`, text_ar: `نقطة لم تُحسم بعد المراجعة الآلية (${u.section}): ${u.issue}` });
    }

    // 8. Finalise
    const readiness = readinessChecklist(built.partial, built.validation);
    const pack: TechPack = TechPack.parse({
      ...built.partial,
      readiness,
      pipeline: {
        stages,
        critique: critique?.data ?? null,
        validation: built.validation,
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        total_ms: Date.now() - t0,
      },
    });
    savePack(pack, jobId);
    updateJob(jobId, { status: "complete", stage: "complete", pack_id: pack.meta.id });
    emit(jobId, { type: "progress", percent: 100, message: `Done in ${Math.round((Date.now() - t0) / 1000)} s` });
    emit(jobId, { type: "complete", packId: pack.meta.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { status: "failed", error: message });
    emit(jobId, { type: "failed", error: message });
  }
}
