import { describe, it, expect } from "vitest";
import { validateTechPack, readinessChecklist } from "@/lib/techpack/validate";
import { deriveBucketHatPoms, defaultHatIntent, patternPiecesForBase, computeConsumption } from "@/lib/geometry/bucket_hat";
import { bucketHatFlats } from "@/lib/flats/bucket_hat";
import { BUCKET_HAT_RULEBOOK as RB } from "@/lib/rulebook/bucket_hat";
import type { TechPack } from "@/lib/techpack/schema";

function fixture(): Omit<TechPack, "readiness" | "pipeline"> {
  const g = deriveBucketHatPoms(defaultHatIntent());
  const pieces = patternPiecesForBase(g, "M");
  return {
    meta: { id: "tp_test", version: "1.0", created_at: "", updated_at: "", template_id: "bucket_hat", generator: { primary_model: "x", pipeline_version: "t" } },
    header: { style_number: "S1", style_name_en: "Hat", style_name_ar: "قبعة", brand: "B", season: "S", category_en: "Headwear", category_ar: "أغطية رأس", product_type_en: "Bucket hat", product_type_ar: "قبعة بكت", base_size: "M", units: "cm", date: "2026-09-02", status: "draft" },
    product: { description_en: "d", description_ar: "و", intended_use_en: "u", intended_use_ar: "س", fit_intent_en: "f", fit_intent_ar: "ق", key_features_en: [], key_features_ar: [], reference_observations_en: [] },
    sizes: RB.sizes.map((s) => ({ code: s.code, label_en: s.label_en, label_ar: s.label_ar, fits_note_en: null, is_base: s.code === "M" })),
    poms: g.poms,
    pattern_pieces: pieces.map(({ net_area_cm2: _a, ...p }) => p),
    bom: [
      { ref: "F1", category: "fabric", item_en: "Twill", item_ar: "تويل", description_en: "100% cotton twill 280 gsm", composition: "100% cotton", weight_gsm: 280, width_cm: 150, placement_en: "shell", placement_ar: "جسم", qty_per_unit: 0.2, unit: "m", colour_rule_en: "per colorway", supplier: "TBC by factory", notes_en: null, source: "stated", confidence: "high" },
      { ref: "T1", category: "thread", item_en: "Thread", item_ar: "خيط", description_en: "Core-spun poly Tex 27", composition: null, weight_gsm: null, width_cm: null, placement_en: "all seams", placement_ar: "كل الخياطات", qty_per_unit: 1, unit: "cone", colour_rule_en: "DTM", supplier: "TBC by factory", notes_en: null, source: "default", confidence: "high" },
      { ref: "L1", category: "label", item_en: "Care label", item_ar: "بطاقة العناية", description_en: "printed", composition: null, weight_gsm: null, width_cm: null, placement_en: "CB", placement_ar: "منتصف الخلف", qty_per_unit: 1, unit: "pcs", colour_rule_en: "white", supplier: "TBC by factory", notes_en: null, source: "default", confidence: "high" },
      { ref: "P1", category: "packaging", item_en: "Polybag", item_ar: "كيس", description_en: "LDPE", composition: null, weight_gsm: null, width_cm: null, placement_en: "one per hat", placement_ar: "واحد لكل قبعة", qty_per_unit: 1, unit: "pcs", colour_rule_en: "clear", supplier: "TBC by factory", notes_en: null, source: "default", confidence: "high" },
    ],
    construction: {
      standards: { stitch_type: "301", seam_type: "SSa", spi_seam: "10-12", spi_topstitch: "8", seam_allowance_cm: 1, topstitch_offset_cm: 0.6, topstitch_rows: 1, needle: "Nm 80", thread_seaming: "Tex 27", thread_topstitch: "Tex 40", interfacing_en: "none", pressing_en: "press" },
      operations: RB.operations.map((o) => ({ ...o, notes_ar: "" })),
      sam_estimate_min: 12,
      sam_note_en: "",
      special_notes_en: [],
      special_notes_ar: [],
    },
    colorways: [{ code: "CW1", name_en: "Khaki/Black", name_ar: "كاكي/أسود", components: [{ component_en: "Outer shell", component_ar: "الجسم الخارجي", colour_name: "Khaki", pantone_tcx: "16-0726 TCX", hex: "#A39264", bom_ref: "F1" }], thread_needle: "khaki", thread_bobbin: "black", label_side_en: "khaki", label_side_ar: "كاكي", notes_en: "" }],
    colorway_note_en: "same hat",
    colorway_note_ar: "نفس القبعة",
    labels: [{ type: "Care / content label", placement_en: "CB", placement_ar: "منتصف الخلف", content_en: "100% cotton", content_ar: "100% قطن", notes_en: "" }, { type: "Brand label", placement_en: "CB seam", placement_ar: "خط منتصف الخلف", content_en: "logo", content_ar: "شعار", notes_en: "" }],
    packaging: { method_en: "fold", method_ar: "طي", items_en: ["polybag"], carton_note_en: "TBC" },
    qc: { aql_en: "AQL 2.5", checks_en: ["a", "b", "c"], checks_ar: ["أ", "ب", "ج"], tests_en: ["gsm"] },
    consumption: computeConsumption(pieces, ["Khaki", "Jet Black"]),
    flats: bucketHatFlats(g, "M"),
    assumptions: [{ text_en: "x", text_ar: "س", impact: "low" }],
    questions_for_factory: [{ text_en: "q", text_ar: "س" }],
    revision_log: [],
  };
}

describe("validator", () => {
  it("accepts a consistent bucket hat pack", () => {
    const v = validateTechPack(fixture());
    expect(v.errors).toEqual([]);
    const r = readinessChecklist(fixture(), v);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("rejects non-monotonic grading and inconsistent geometry", () => {
    const f = fixture();
    const A = f.poms.find((p) => p.code === "A")!;
    A.values.L = 50;
    const v = validateTechPack(f);
    expect(v.errors.some((e) => e.includes("decreases"))).toBe(true);
    expect(v.errors.some((e) => e.includes("brim outer circumference"))).toBe(true);
  });

  it("flags a flat that claims a POM without an anchor", () => {
    const f = fixture();
    f.flats[0].pom_codes.push("Z");
    const v = validateTechPack(f);
    expect(v.errors.some((e) => e.includes("no anchor"))).toBe(true);
  });
});
