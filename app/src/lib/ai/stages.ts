import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClient, MODELS, summarizeUsage, assertCompleted, RefusalError, type UsageSummary } from "./client";
import { VisionObservation, TechPackDraft, CritiqueOutput, DraftPartA, DraftPartB, DraftPartC, DRAFT_PART_GUIDE } from "./llm-schemas";
import { VISION_SYSTEM, DRAFT_SYSTEM_STABLE, CRITIQUE_SYSTEM, REPAIR_SYSTEM_SUFFIX, RECONCILE_SYSTEM } from "./prompts";
import type { z } from "zod";

export interface StageResult<T> {
  data: T;
  model: string;
  usage: UsageSummary;
  ms: number;
}

export interface GenerationOptions {
  brand: string;
  styleNumber: string;
  season: string;
  runQuantity: number | null;
  targetMarket: string;
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Runs a structured-output request. On a classifier refusal from the primary
 * model, retries once on the fast model (which carries no refusal classifiers).
 */
async function structured<S extends z.ZodTypeAny>(opts: {
  model: string;
  schema: S;
  system: string | Anthropic.Messages.TextBlockParam[];
  content: Anthropic.Messages.ContentBlockParam[];
  effort: Effort;
  maxTokens: number;
  onText?: (delta: string) => void;
}): Promise<StageResult<z.infer<S>>> {
  const client = getClient();
  const started = Date.now();
  const run = async (model: string) => {
    const stream = client.messages.stream({
      model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
      messages: [{ role: "user", content: opts.content }],
    });
    if (opts.onText) stream.on("text", opts.onText);
    const msg = await stream.finalMessage();
    assertCompleted(model, msg);
    const text = msg.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map((b) => b.text).join("");
    const data = opts.schema.parse(JSON.parse(text));
    return { data, model, usage: summarizeUsage(model, msg.usage), ms: Date.now() - started };
  };
  try {
    return await run(opts.model);
  } catch (err) {
    if (err instanceof RefusalError && opts.model !== MODELS.fast) {
      return await run(MODELS.fast);
    }
    throw err;
  }
}

export async function visionStage(image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }, description: string) {
  return structured({
    model: MODELS.primary,
    schema: VisionObservation,
    system: VISION_SYSTEM,
    effort: "medium",
    maxTokens: 8000,
    content: [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
      {
        type: "text",
        text: `Buyer description: """${description.trim() || "(none)"}"""\n\nAnalyse the image for a tech pack. Report the product family, every visible panel and seam, brim and crown classes, visible topstitch rows, colours per area with hex estimates, any printed text verbatim, hardware, and reversible evidence. Return only the structured output.`,
      },
    ],
  });
}

export function draftSystem(): Anthropic.Messages.TextBlockParam[] {
  return [{ type: "text", text: DRAFT_SYSTEM_STABLE, cache_control: { type: "ephemeral" } }];
}

function mergeParts<T>(parts: StageResult<unknown>[], data: T): StageResult<T> {
  const usage = parts.reduce(
    (acc, p) => ({
      input_tokens: acc.input_tokens + p.usage.input_tokens,
      output_tokens: acc.output_tokens + p.usage.output_tokens,
      cache_read_tokens: acc.cache_read_tokens + p.usage.cache_read_tokens,
      cache_write_tokens: acc.cache_write_tokens + p.usage.cache_write_tokens,
      cost_usd: Math.round((acc.cost_usd + p.usage.cost_usd) * 10000) / 10000,
    }),
    { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, cost_usd: 0 },
  );
  return { data, model: parts[0]?.model ?? MODELS.primary, usage, ms: Math.max(...parts.map((p) => p.ms)) };
}

/**
 * Draft generation runs as three parallel structured calls (the combined schema
 * is too large for one grammar), all sharing the cached rulebook system prompt.
 */
export async function draftStage(
  input: { observation: VisionObservation; description: string; templateId: string; options: GenerationOptions },
  onText?: (delta: string) => void,
): Promise<StageResult<TechPackDraft>> {
  const { observation, description, templateId, options } = input;
  const brief = [
    `TEMPLATE: ${templateId}`,
    `BUYER DESCRIPTION: """${description.trim() || "(none)"}"""`,
    `BRAND: ${options.brand || "TBC"} | STYLE NO: ${options.styleNumber} | SEASON: ${options.season} | TARGET MARKET: ${options.targetMarket} | RUN QUANTITY: ${options.runQuantity ?? "not stated"}`,
    `VISION OBSERVATION (structured, from the reference image): ${JSON.stringify(observation)}`,
    "",
    "The tech pack is produced in three parts by parallel calls; write your part completely and consistently with the rulebook so the parts fit together. Base size is M. Return only the structured output.",
  ].join("\n");
  const part = <S extends z.ZodTypeAny>(schema: S, guide: string, effort: Effort) =>
    structured({ model: MODELS.primary, schema, system: draftSystem(), effort, maxTokens: 24000, content: [{ type: "text", text: `${brief}\n\n${guide}` }], onText });
  const [a, b, c] = await Promise.all([part(DraftPartA, DRAFT_PART_GUIDE.A, "high"), part(DraftPartB, DRAFT_PART_GUIDE.B, "medium"), part(DraftPartC, DRAFT_PART_GUIDE.C, "medium")]);
  const data = TechPackDraft.parse({ ...a.data, ...b.data, ...c.data });
  return mergeParts([a, b, c], data);
}

/** Cheap consistency pass: aligns the colorways/labels/packaging part with the BOM it could not see. */
export async function reconcileStage(draft: TechPackDraft): Promise<StageResult<TechPackDraft>> {
  const partC = DraftPartC.parse(draft);
  const partB = DraftPartB.parse(draft);
  const r = await structured({
    model: MODELS.fast,
    schema: DraftPartC,
    system: RECONCILE_SYSTEM,
    effort: "low",
    maxTokens: 16000,
    content: [{ type: "text", text: `AUTHORITATIVE BOM + CONSTRUCTION:\n${JSON.stringify(partB)}\n\nBLOCK TO RECONCILE (colorways, labels, packaging, qc, assumptions, questions):\n${JSON.stringify(partC)}\n\nReturn the reconciled block.` }],
  });
  return { ...r, data: TechPackDraft.parse({ ...draft, ...r.data }) };
}

export async function critiqueStage(packForReview: unknown) {
  return structured({
    model: MODELS.fast,
    schema: CritiqueOutput,
    system: CRITIQUE_SYSTEM,
    effort: "low",
    maxTokens: 6000,
    content: [{ type: "text", text: `TECH PACK UNDER REVIEW (JSON, sketches omitted):\n${JSON.stringify(packForReview)}` }],
  });
}

const PART_KEYWORDS: Record<"A" | "B" | "C", RegExp> = {
  A: /header|product|description|intended|fit|size|intent|pom|measure|spec|geometry|grade|circumference|crown|brim width|tip/i,
  B: /bom|bill|material|fabric|thread|needle|construction|operation|op sheet|stitch|spi|seam|interfacing|press/i,
  C: /colou?rway|colour|color|pantone|label|care|packag|carton|qc|quality|aql|assumption|question|hangtag/i,
};

/** Re-runs only the draft parts that the review issues concern (all three if none match). */
export async function repairStage(draft: TechPackDraft, issues: CritiqueOutput["issues"], onText?: (delta: string) => void): Promise<StageResult<TechPackDraft>> {
  const system: Anthropic.Messages.TextBlockParam[] = [...draftSystem(), { type: "text", text: REPAIR_SYSTEM_SUFFIX }];
  const issuesText = JSON.stringify(issues);
  const touched = new Set<"A" | "B" | "C">();
  for (const i of issues) {
    const text = `${i.section} ${i.issue} ${i.fix}`;
    (Object.keys(PART_KEYWORDS) as ("A" | "B" | "C")[]).forEach((k) => {
      if (PART_KEYWORDS[k].test(text)) touched.add(k);
    });
  }
  if (touched.size === 0) ["A", "B", "C"].forEach((k) => touched.add(k as "A" | "B" | "C"));
  const part = <S extends z.ZodTypeAny>(schema: S, guide: string, current: unknown) =>
    structured({
      model: MODELS.primary,
      schema,
      system,
      effort: "medium",
      maxTokens: 24000,
      content: [{ type: "text", text: `${guide}\n\nCURRENT PART (JSON):\n${JSON.stringify(current)}\n\nISSUES FROM FACTORY REVIEW (apply the ones that concern this part; leave everything else unchanged):\n${issuesText}\n\nReturn the complete revised part.` }],
      onText,
    });
  const [a, b, c] = await Promise.all([
    touched.has("A") ? part(DraftPartA, DRAFT_PART_GUIDE.A, DraftPartA.parse(draft)) : null,
    touched.has("B") ? part(DraftPartB, DRAFT_PART_GUIDE.B, DraftPartB.parse(draft)) : null,
    touched.has("C") ? part(DraftPartC, DRAFT_PART_GUIDE.C, DraftPartC.parse(draft)) : null,
  ]);
  const data = TechPackDraft.parse({ ...draft, ...(a?.data ?? {}), ...(b?.data ?? {}), ...(c?.data ?? {}) });
  const ran = [a, b, c].filter((x) => x !== null) as StageResult<unknown>[];
  return mergeParts(ran, data);
}
