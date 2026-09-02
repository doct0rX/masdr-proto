import { TechPack } from "./schema";
import { validateTechPack, readinessChecklist } from "./validate";
import { deriveBucketHatPoms, defaultHatIntent, patternPiecesForBase, computeConsumption, type HatSize } from "@/lib/geometry/bucket_hat";
import { bucketHatFlats } from "@/lib/flats/bucket_hat";

const EDITABLE = new Set<keyof TechPack>([
  "header",
  "product",
  "sizes",
  "poms",
  "bom",
  "construction",
  "colorways",
  "colorway_note_en",
  "colorway_note_ar",
  "labels",
  "packaging",
  "qc",
  "assumptions",
  "questions_for_factory",
]);

function bumpVersion(v: string): string {
  const [maj, min] = v.split(".").map((n) => Number(n) || 0);
  return `${maj}.${min + 1}`;
}

/**
 * Applies a section-level edit, re-derives bucket-hat geometry from the edited
 * base-size values so S/L stay consistent with M, re-validates and re-scores.
 */
export function applyPackEdit(pack: TechPack, changes: Partial<TechPack>, note: string, author: string): TechPack {
  const next: TechPack = structuredClone(pack);
  for (const [k, v] of Object.entries(changes)) {
    if (!EDITABLE.has(k as keyof TechPack)) throw new Error(`Section '${k}' is not editable`);
    (next as unknown as Record<string, unknown>)[k] = v;
  }

  if (next.meta.template_id === "bucket_hat" && changes.poms) {
    const base = next.header.base_size;
    const get = (code: string) => next.poms.find((p) => p.code === code)?.values[base];
    const intent = defaultHatIntent();
    const A = get("A");
    const B = get("B");
    const C = get("C");
    const G = get("G");
    const H = get("H");
    if (A) intent.inner_circumference_cm = A;
    if (B) intent.crown_height_cm = B;
    if (C) intent.brim_width_cm = C;
    if (G) intent.topstitch_offset_cm = G;
    // Keep the crown taper unless H itself was edited: widening A should grow the tip, not the taper.
    const oldA = pack.poms.find((p) => p.code === "A")?.values[base];
    const oldH = pack.poms.find((p) => p.code === "H")?.values[base];
    const hEdited = H !== undefined && oldH !== undefined && Math.abs(H - oldH) > 0.01;
    if (hEdited && A && H && A > H) intent.band_taper_cm = Math.round((A - H) * 10) / 10;
    else if (oldA !== undefined && oldH !== undefined && oldA > oldH) intent.band_taper_cm = Math.round((oldA - oldH) * 10) / 10;
    const bIdx = Math.max(0, next.sizes.findIndex((s) => s.is_base));
    const sizes: HatSize[] = next.sizes.map((s, i) => ({ code: s.code, offset_from_base: i - bIdx }));
    for (const p of pack.poms) {
      const key = ({ A: "inner_circumference_cm", B: "crown_height_cm", C: "brim_width_cm", G: "topstitch_offset_cm" } as const)[p.code as "A" | "B" | "C" | "G"];
      if (key) intent.sources[key] = { source: get(p.code) !== p.values[base] ? "stated" : p.source, confidence: "high" };
    }
    const g = deriveBucketHatPoms(intent, sizes);
    next.poms = g.poms;
    const pieces = patternPiecesForBase(g, base);
    next.pattern_pieces = pieces.map(({ net_area_cm2, ...p }) => ({ ...p, notes_en: `${p.notes_en} Net cut area ${net_area_cm2} cm² per shell.` }));
    next.consumption = computeConsumption(pieces, next.consumption.per_unit.map((c) => c.colour), {
      widthCm: next.consumption.fabric_width_cm,
      usableWidthCm: next.consumption.usable_width_cm,
      efficiency: next.consumption.marker_efficiency,
      shrinkagePct: next.consumption.shrinkage_allowance_pct,
      runQuantity: next.consumption.run_quantity,
    });
    next.flats = bucketHatFlats(g, base);
    next.construction.standards.topstitch_offset_cm = intent.topstitch_offset_cm;
  }

  const partial = { ...next } as Omit<TechPack, "readiness" | "pipeline"> & Partial<Pick<TechPack, "readiness" | "pipeline">>;
  delete partial.readiness;
  delete partial.pipeline;
  const validation = validateTechPack(partial);
  next.readiness = readinessChecklist(partial, validation);
  next.pipeline = { ...next.pipeline, validation };
  next.meta.version = bumpVersion(next.meta.version);
  next.meta.updated_at = new Date().toISOString();
  next.header.status = "reviewed";
  next.revision_log = [...next.revision_log, { version: next.meta.version, date: new Date().toISOString().slice(0, 10), author, change_en: note }];
  return TechPack.parse(next);
}
