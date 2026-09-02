import type { TechPack } from "./schema";
import { COS_DROP } from "@/lib/geometry/bucket_hat";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Business-rule validation. Errors are things a factory would bounce; warnings
 * are things a technical designer would fix before sending.
 */
export function validateTechPack(pack: Omit<TechPack, "readiness" | "pipeline">): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sizeCodes = pack.sizes.map((s) => s.code);

  if (pack.sizes.length < 3) errors.push(`Spec chart must cover at least 3 sizes (has ${pack.sizes.length})`);
  if (!pack.sizes.some((s) => s.is_base)) errors.push("No base size marked");

  for (const pom of pack.poms) {
    const vals = sizeCodes.map((c) => pom.values[c]);
    if (vals.some((v) => v === undefined || Number.isNaN(v))) {
      errors.push(`POM ${pom.code} is missing a value for one or more sizes`);
      continue;
    }
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < vals[i - 1]) errors.push(`POM ${pom.code} (${pom.name_en}) decreases from ${sizeCodes[i - 1]} to ${sizeCodes[i]}`);
    }
    if (!(pom.tolerance_cm > 0)) errors.push(`POM ${pom.code} has no tolerance`);
    if (!pom.name_ar) warnings.push(`POM ${pom.code} has no Arabic name`);
  }

  const codes = new Set(pack.poms.map((p) => p.code));
  const anchored = new Set(pack.flats.flatMap((f) => f.pom_codes));
  for (const c of codes) {
    if (!anchored.has(c)) warnings.push(`POM ${c} is not called out on any flat sketch`);
  }
  for (const f of pack.flats) {
    for (const c of f.pom_codes) {
      if (!f.svg.includes(`id="pom-${c}"`)) errors.push(`Flat '${f.id}' claims POM ${c} but the SVG has no anchor for it`);
    }
  }

  // Bucket-hat geometry consistency: D ≈ H/π and F ≈ A + 2πC
  if (pack.meta.template_id === "bucket_hat") {
    const A = pack.poms.find((p) => p.code === "A");
    const C = pack.poms.find((p) => p.code === "C");
    const D = pack.poms.find((p) => p.code === "D");
    const F = pack.poms.find((p) => p.code === "F");
    const H = pack.poms.find((p) => p.code === "H");
    for (const s of sizeCodes) {
      if (D && H && Math.abs(D.values[s] - H.values[s] / Math.PI) > 0.15) errors.push(`Size ${s}: tip diameter D (${D.values[s]}) inconsistent with tip circumference H (${H.values[s]})`);
      if (A && C && F && Math.abs(F.values[s] - (A.values[s] + 2 * Math.PI * C.values[s] * COS_DROP)) > 0.3) errors.push(`Size ${s}: brim outer circumference F inconsistent with A + 2π·C·cos30°`);
      if (A && H && !(A.values[s] > H.values[s])) errors.push(`Size ${s}: crown tip circumference must be smaller than head circumference`);
    }
    if (A) {
      const grades = sizeCodes.slice(1).map((c, i) => A.values[c] - A.values[sizeCodes[i]]);
      if (grades.some((g) => Math.abs(g - grades[0]) > 0.05)) warnings.push("Head circumference grade is not uniform across sizes");
    }
  }

  // Prose-vs-POM cross-check: topstitch offsets quoted in the operation sheet must equal G
  const G = pack.poms.find((p) => p.code === "G");
  if (G) {
    const gMm = Math.round(G.values[pack.header.base_size] * 10);
    for (const op of pack.construction.operations) {
      if (!/topstitch/i.test(op.operation_en)) continue;
      const m = op.operation_en.match(/(\d+(?:\.\d+)?)\s*(mm|cm)\b/);
      if (!m) continue;
      const mm = m[2] === "cm" ? Math.round(Number(m[1]) * 10) : Math.round(Number(m[1]));
      if (Math.abs(mm - gMm) > 0.5) warnings.push(`Operation ${op.step} quotes a topstitch offset of ${m[1]} ${m[2]} but POM G is ${G.values[pack.header.base_size]} cm`);
    }
    if (Math.round(pack.construction.standards.topstitch_offset_cm * 10) !== gMm) errors.push("Construction standards topstitch offset differs from POM G");
  }

  // BOM completeness
  const cats = new Set(pack.bom.map((b) => b.category));
  if (!cats.has("fabric")) errors.push("BOM has no fabric line");
  if (!cats.has("thread")) errors.push("BOM has no thread line");
  if (!cats.has("label")) errors.push("BOM has no label line");
  if (!cats.has("packaging")) warnings.push("BOM has no packaging line");
  for (const b of pack.bom) {
    if (b.category === "fabric" && (!b.weight_gsm || !b.width_cm)) warnings.push(`Fabric ${b.ref} is missing gsm or width`);
    if (!(b.qty_per_unit >= 0)) errors.push(`BOM ${b.ref} has no quantity per unit`);
    else if (b.qty_per_unit === 0) warnings.push(`BOM ${b.ref} (${b.item_en}) is listed at zero quantity: optional item, confirm before costing`);
    if (!b.item_ar) warnings.push(`BOM ${b.ref} has no Arabic name`);
  }

  // Construction
  const st = pack.construction.standards;
  if (!st.stitch_type) errors.push("Construction: stitch type missing");
  if (!st.spi_seam) errors.push("Construction: SPI missing");
  if (!(st.seam_allowance_cm > 0)) errors.push("Construction: seam allowance missing");
  if (pack.construction.operations.length < 5) errors.push("Construction: operation sheet is too short to be actionable");
  for (const op of pack.construction.operations) {
    if (!op.operation_ar) warnings.push(`Operation ${op.step} has no Arabic text`);
  }

  // Colorways
  if (pack.colorways.length === 0) errors.push("No colorways");
  for (const cw of pack.colorways) {
    if (cw.components.length === 0) errors.push(`Colorway ${cw.code} has no components`);
    for (const c of cw.components) {
      if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) errors.push(`Colorway ${cw.code}: ${c.component_en} colour has no hex reference`);
      if (!c.pantone_tcx) warnings.push(`Colorway ${cw.code}: ${c.component_en} has no Pantone TCX reference`);
    }
  }

  // Colorway components must cite a BOM line of the matching colour
  const bomByRef = new Map(pack.bom.map((b) => [b.ref, b]));
  for (const cw of pack.colorways) {
    for (const c of cw.components) {
      const b = bomByRef.get(c.bom_ref);
      if (!b) {
        warnings.push(`Colorway ${cw.code}: ${c.component_en} cites BOM ref ${c.bom_ref} which does not exist`);
        continue;
      }
      const hay = `${b.item_en} ${b.colour_rule_en} ${b.description_en}`.toLowerCase();
      const words = c.colour_name.toLowerCase().split(/[\s/-]+/).filter((w) => w.length > 3 && !["jet", "bright", "dark", "light"].includes(w));
      const otherColours = ["khaki", "black", "white", "navy", "grey", "gray", "beige", "olive", "red", "blue", "green"].filter((x) => !words.includes(x));
      const mentionsOwn = words.some((w) => hay.includes(w));
      if (!mentionsOwn && b.category !== "label" && b.category !== "trim" && otherColours.some((x) => hay.includes(x))) warnings.push(`Colorway ${cw.code}: ${c.component_en} is ${c.colour_name} but cites ${c.bom_ref} (${b.item_en})`);
    }
  }

  if (pack.labels.length === 0) errors.push("No label specification");
  if (!pack.labels.some((l) => /care|content|origin/i.test(l.type))) warnings.push("No care/content/origin label specified (required in Egypt under ES 7266)");
  if (!pack.qc.aql_en) warnings.push("No AQL / inspection level stated");
  if (pack.consumption.per_unit.length === 0) warnings.push("No fabric consumption computed");

  return { errors, warnings };
}

export interface ReadinessResult {
  score: number;
  checks: { item_en: string; pass: boolean; note_en: string }[];
}

/** Factory-readiness checklist derived from common tech pack rejection causes. */
export function readinessChecklist(pack: Omit<TechPack, "readiness" | "pipeline">, v: ValidationResult): ReadinessResult {
  const checks: ReadinessResult["checks"] = [];
  const add = (item_en: string, pass: boolean, note_en = "") => checks.push({ item_en, pass, note_en });

  add("Graded spec chart with tolerances for 3+ sizes", pack.sizes.length >= 3 && pack.poms.every((p) => p.tolerance_cm > 0), `${pack.poms.length} POMs`);
  add("Every POM has a how-to-measure instruction", pack.poms.every((p) => p.how_to_measure_en.length > 10));
  add("POMs anchored on technical flats", pack.flats.length > 0 && v.warnings.every((w) => !w.includes("not called out")));
  add("BOM lists fabric with composition, gsm and width", pack.bom.some((b) => b.category === "fabric" && !!b.composition && !!b.weight_gsm && !!b.width_cm));
  add("BOM lists thread with Tex/ticket", pack.bom.some((b) => b.category === "thread" && /tex|tkt|ticket/i.test(b.description_en + b.item_en)));
  add("Labels: brand, care/content/origin, size", pack.labels.length >= 2);
  add("Construction: stitch type, SPI, seam allowance, needle", !!pack.construction.standards.stitch_type && !!pack.construction.standards.spi_seam && pack.construction.standards.seam_allowance_cm > 0 && !!pack.construction.standards.needle);
  add("Operation sheet with machine per step", pack.construction.operations.length >= 8 && pack.construction.operations.every((o) => !!o.machine));
  add("Colours referenced by Pantone TCX and hex, not names only", pack.colorways.every((c) => c.components.every((x) => !!x.pantone_tcx && /^#/.test(x.hex))));
  add("Fabric consumption per unit computed", pack.consumption.per_unit.length > 0);
  add("Packaging and carton instructions", !!pack.packaging.method_en);
  add("QC: AQL and inspection checks", !!pack.qc.aql_en && pack.qc.checks_en.length >= 3);
  add("Assumptions and open questions listed for the factory", pack.assumptions.length > 0 && pack.questions_for_factory.length > 0);
  add("Bilingual Arabic gloss on POMs and operations", pack.poms.every((p) => !!p.name_ar) && pack.construction.operations.every((o) => !!o.operation_ar));
  add("No validation errors", v.errors.length === 0, v.errors.length ? `${v.errors.length} error(s)` : "");

  const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
  return { score, checks };
}
