import { describe, it, expect } from "vitest";
import { applyPackEdit } from "@/lib/techpack/edit";
import { validateTechPack, readinessChecklist } from "@/lib/techpack/validate";
import { deriveBucketHatPoms, defaultHatIntent, patternPiecesForBase, computeConsumption } from "@/lib/geometry/bucket_hat";
import { bucketHatFlats } from "@/lib/flats/bucket_hat";
import { BUCKET_HAT_RULEBOOK as RB } from "@/lib/rulebook/bucket_hat";
import type { TechPack } from "@/lib/techpack/schema";

function fullPack(): TechPack {
  const g = deriveBucketHatPoms(defaultHatIntent());
  const pieces = patternPiecesForBase(g, "M");
  const partial = {
    meta: { id: "tp_edit", version: "1.0", created_at: "", updated_at: "", template_id: "bucket_hat", generator: { primary_model: "x", pipeline_version: "t" } },
    header: { style_number: "S1", style_name_en: "Hat", style_name_ar: "قبعة", brand: "B", season: "S", category_en: "Headwear", category_ar: "أغطية رأس", product_type_en: "Bucket hat", product_type_ar: "قبعة بكت", base_size: "M", units: "cm" as const, date: "2026-09-02", status: "draft" as const },
    product: { description_en: "d", description_ar: "و", intended_use_en: "u", intended_use_ar: "س", fit_intent_en: "f", fit_intent_ar: "ق", key_features_en: [], key_features_ar: [], reference_observations_en: [] },
    sizes: RB.sizes.map((s) => ({ code: s.code, label_en: s.label_en, label_ar: s.label_ar, fits_note_en: null, is_base: s.code === "M" })),
    poms: g.poms,
    pattern_pieces: pieces.map(({ net_area_cm2: _a, ...p }) => p),
    bom: [
      { ref: "F1", category: "fabric" as const, item_en: "Twill", item_ar: "تويل", description_en: "100% cotton twill 280 gsm", composition: "100% cotton", weight_gsm: 280, width_cm: 150, placement_en: "shell", placement_ar: "جسم", qty_per_unit: 0.2, unit: "m", colour_rule_en: "per colorway", supplier: "TBC", notes_en: null, source: "stated" as const, confidence: "high" as const },
      { ref: "T1", category: "thread" as const, item_en: "Thread", item_ar: "خيط", description_en: "Tex 30", composition: null, weight_gsm: null, width_cm: null, placement_en: "seams", placement_ar: "خياطات", qty_per_unit: 1, unit: "cone", colour_rule_en: "DTM", supplier: "TBC", notes_en: null, source: "default" as const, confidence: "high" as const },
      { ref: "L1", category: "label" as const, item_en: "Care label", item_ar: "بطاقة", description_en: "printed", composition: null, weight_gsm: null, width_cm: null, placement_en: "CB", placement_ar: "خلف", qty_per_unit: 1, unit: "pcs", colour_rule_en: "white", supplier: "TBC", notes_en: null, source: "default" as const, confidence: "high" as const },
    ],
    construction: {
      standards: { stitch_type: "301", seam_type: "SSa", spi_seam: "10-12", spi_topstitch: "8", seam_allowance_cm: 1, topstitch_offset_cm: 0.6, topstitch_rows: 1, needle: "Nm 80", thread_seaming: "Tex 30", thread_topstitch: "Tex 40", interfacing_en: "none", pressing_en: "press" },
      operations: RB.operations.map((o) => ({ ...o, notes_ar: "" })),
      sam_estimate_min: 13.5,
      sam_note_en: "",
      special_notes_en: [],
      special_notes_ar: [],
    },
    colorways: [{ code: "CW1", name_en: "Khaki/Black", name_ar: "كاكي/أسود", components: [{ component_en: "Outer shell", component_ar: "خارجي", colour_name: "Khaki", pantone_tcx: "16-0726 TCX", hex: "#A39264", bom_ref: "F1" }], thread_needle: "khaki", thread_bobbin: "black", label_side_en: "khaki", label_side_ar: "كاكي", notes_en: "" }],
    colorway_note_en: "same hat",
    colorway_note_ar: "نفس القبعة",
    labels: [{ type: "Care / content label", placement_en: "CB", placement_ar: "خلف", content_en: "100% cotton", content_ar: "قطن", notes_en: "" }],
    packaging: { method_en: "fold", method_ar: "طي", items_en: ["polybag"], carton_note_en: "TBC" },
    qc: { aql_en: "AQL 2.5", checks_en: ["a", "b", "c"], checks_ar: ["أ", "ب", "ج"], tests_en: ["gsm"] },
    consumption: computeConsumption(pieces, ["Khaki", "Jet Black"]),
    flats: bucketHatFlats(g, "M"),
    assumptions: [{ text_en: "x", text_ar: "س", impact: "low" as const }],
    questions_for_factory: [{ text_en: "q", text_ar: "س" }],
    revision_log: [{ version: "1.0", date: "2026-09-02", author: "AI", change_en: "init" }],
  };
  const validation = validateTechPack(partial);
  return { ...partial, readiness: readinessChecklist(partial, validation), pipeline: { stages: [], critique: null, validation, total_cost_usd: 0, total_ms: 0 } };
}

describe("applyPackEdit", () => {
  it("regrades S and L when the base-size circumference is edited", () => {
    const pack = fullPack();
    const edited = pack.poms.map((p) => (p.code === "A" ? { ...p, values: { ...p.values, M: 60 } } : p));
    const next = applyPackEdit(pack, { poms: edited }, "test", "tester");
    const A = next.poms.find((p) => p.code === "A")!;
    expect([A.values.S, A.values.M, A.values.L]).toEqual([58, 60, 62]);
    const D = next.poms.find((p) => p.code === "D")!;
    const H = next.poms.find((p) => p.code === "H")!;
    expect(Math.abs(D.values.M - H.values.M / Math.PI)).toBeLessThan(0.1);
    expect(H.values.M).toBeCloseTo(57.5, 1); // taper of 2.5 preserved, tip grows with the head opening
    expect(A.source).toBe("stated");
    expect(next.meta.version).toBe("1.1");
    expect(next.revision_log.at(-1)?.change_en).toBe("test");
    expect(next.pipeline.validation.errors).toEqual([]);
    expect(next.flats[0].svg).toContain('id="pom-A"');
  });

  it("rejects edits to non-editable sections", () => {
    const pack = fullPack();
    expect(() => applyPackEdit(pack, { meta: pack.meta } as Partial<TechPack>, "x", "y")).toThrow();
  });
});
