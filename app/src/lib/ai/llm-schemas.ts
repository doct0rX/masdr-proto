import { z } from "zod";

/**
 * Schemas for LLM structured outputs. Constraints: no records (additionalProperties
 * must be false), no numeric min/max, no recursion. Optional data is expressed
 * with .nullable() so every property stays required.
 */

const Conf = z.enum(["high", "medium", "low"]);
const Src = z.enum(["measured", "stated", "derived", "default", "inferred"]);

export const ProductFamily = z.enum([
  "bucket_hat",
  "cap",
  "beanie",
  "tshirt",
  "polo",
  "hoodie",
  "sweatshirt",
  "shirt",
  "trousers",
  "shorts",
  "dress",
  "jacket",
  "bag",
  "other",
]);
export type ProductFamily = z.infer<typeof ProductFamily>;

export const VisionObservation = z.object({
  product_type: z.string().describe("Plain-language product type, e.g. 'reversible bucket hat'"),
  product_family: ProductFamily,
  input_kind: z.enum(["photo", "sketch", "technical_flat", "mixed"]),
  silhouette_notes: z.array(z.string()),
  panels_observed: z.array(z.string()).describe("Visible panels/pattern pieces and seam lines"),
  brim: z.object({
    present: z.boolean(),
    width_class: z.enum(["none", "narrow", "medium", "wide", "unknown"]),
    topstitch_rows: z.number().nullable().describe("Number of visible topstitch rows on the brim, null if not visible"),
    notes: z.string(),
  }),
  crown: z.object({
    height_class: z.enum(["none", "shallow", "medium", "deep", "unknown"]),
    shape: z.string(),
  }),
  closures_hardware: z.array(z.string()).describe("Eyelets, cords, adjusters, buttons, zips; empty if none visible"),
  colours: z.array(
    z.object({
      area: z.string(),
      name: z.string(),
      hex_estimate: z.string(),
    }),
  ),
  text_in_image: z.array(z.string()).describe("Verbatim text printed on the image, e.g. spec notes"),
  reversible_evidence: z.enum(["explicit", "likely", "none"]),
  construction_cues: z.array(z.string()),
  attribute_confidence: z.array(z.object({ attribute: z.string(), confidence: Conf })),
  overall_confidence: Conf,
});
export type VisionObservation = z.infer<typeof VisionObservation>;

const Sourced = z.object({ value: z.number(), source: Src, confidence: Conf, note: z.string() });

export const DraftBom = z.object({
  ref: z.string().describe("Short ref like F1, T1, L1, P1"),
  category: z.enum(["fabric", "interfacing", "thread", "label", "trim", "hardware", "packaging", "other"]),
  item_en: z.string(),
  item_ar: z.string(),
  description_en: z.string(),
  composition: z.string().nullable(),
  weight_gsm: z.number().nullable(),
  width_cm: z.number().nullable(),
  placement_en: z.string(),
  placement_ar: z.string(),
  qty_per_unit: z.number(),
  unit: z.string().describe("m, pcs, cone, set, sheet"),
  colour_rule_en: z.string().describe("e.g. 'per colorway table', 'DTM outer shell', 'black only'"),
  supplier: z.string().describe("'TBC by factory' unless the buyer named one"),
  notes_en: z.string().nullable(),
  source: Src,
  confidence: Conf,
});

export const DraftOperation = z.object({
  step: z.number(),
  operation_en: z.string(),
  operation_ar: z.string(),
  machine: z.string(),
  stitch: z.string().describe("ISO 4915 code, e.g. 301"),
  spi: z.string(),
  notes_en: z.string(),
  notes_ar: z.string(),
});

export const DraftColorway = z.object({
  code: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  components: z.array(
    z.object({
      component_en: z.string(),
      component_ar: z.string(),
      colour_name: z.string(),
      pantone_tcx: z.string(),
      hex: z.string(),
      bom_ref: z.string(),
    }),
  ),
  thread_needle: z.string(),
  thread_bobbin: z.string(),
  label_side_en: z.string(),
  label_side_ar: z.string(),
  notes_en: z.string(),
});

export const DraftLabel = z.object({
  type: z.string(),
  placement_en: z.string(),
  placement_ar: z.string(),
  content_en: z.string(),
  content_ar: z.string(),
  notes_en: z.string(),
});

/** Generic POM row for products without a code-derived geometry template. */
export const DraftPom = z.object({
  code: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  how_to_measure_en: z.string(),
  how_to_measure_ar: z.string(),
  base_value_cm: z.number(),
  grade_cm: z.number().describe("Increment between consecutive sizes"),
  tolerance_cm: z.number(),
  source: Src,
  confidence: Conf,
});

export const TechPackDraft = z.object({
  header: z.object({
    style_name_en: z.string(),
    style_name_ar: z.string(),
    category_en: z.string(),
    category_ar: z.string(),
    product_type_en: z.string(),
    product_type_ar: z.string(),
    season: z.string(),
  }),
  product: z.object({
    description_en: z.string(),
    description_ar: z.string(),
    intended_use_en: z.string(),
    intended_use_ar: z.string(),
    fit_intent_en: z.string(),
    fit_intent_ar: z.string(),
    key_features_en: z.array(z.string()),
    key_features_ar: z.array(z.string()),
  }),
  sizes: z.array(
    z.object({
      code: z.string(),
      label_en: z.string(),
      label_ar: z.string(),
      fits_note_en: z.string().nullable(),
      is_base: z.boolean(),
    }),
  ),
  /** Bucket-hat template: base-size intent. Null for other templates. */
  hat_base_intent: z
    .object({
      inner_circumference_cm: Sourced,
      crown_height_cm: Sourced,
      brim_width_cm: Sourced,
      band_taper_cm: Sourced,
      topstitch_offset_cm: Sourced,
      topstitch_rows: Sourced,
      crown_height_grade_cm: Sourced,
    })
    .nullable(),
  /** Generic template: model-proposed POMs. Null for the bucket-hat template. */
  generic_poms: z.array(DraftPom).nullable(),
  bom: z.array(DraftBom),
  construction: z.object({
    standards: z.object({
      stitch_type: z.string(),
      seam_type: z.string(),
      spi_seam: z.string(),
      spi_topstitch: z.string(),
      seam_allowance_cm: z.number(),
      needle: z.string(),
      thread_seaming: z.string(),
      thread_topstitch: z.string(),
      interfacing_en: z.string(),
      pressing_en: z.string(),
    }),
    operations: z.array(DraftOperation),
    sam_estimate_min: z.number().nullable(),
    sam_note_en: z.string(),
    special_notes_en: z.array(z.string()),
    special_notes_ar: z.array(z.string()),
  }),
  colorways: z.array(DraftColorway),
  colorway_note_en: z.string(),
  colorway_note_ar: z.string(),
  labels: z.array(DraftLabel),
  packaging: z.object({
    method_en: z.string(),
    method_ar: z.string(),
    items_en: z.array(z.string()),
    carton_note_en: z.string(),
  }),
  qc: z.object({
    aql_en: z.string(),
    checks_en: z.array(z.string()),
    checks_ar: z.array(z.string()),
    tests_en: z.array(z.string()),
  }),
  assumptions: z.array(z.object({ text_en: z.string(), text_ar: z.string(), impact: z.enum(["low", "medium", "high"]) })),
  questions_for_factory: z.array(z.object({ text_en: z.string(), text_ar: z.string() })),
});
export type TechPackDraft = z.infer<typeof TechPackDraft>;

export const CritiqueOutput = z.object({
  factory_readiness_score: z.number().describe("0-100"),
  verdict: z.enum(["pass", "repair"]),
  issues: z.array(
    z.object({
      section: z.string(),
      issue: z.string(),
      fix: z.string(),
      severity: z.enum(["blocking", "warning"]),
    }),
  ),
  strengths: z.array(z.string()),
});
export type CritiqueOutput = z.infer<typeof CritiqueOutput>;

/**
 * The full draft schema exceeds the API's grammar-size limit for structured
 * outputs, so generation runs as three smaller parts in parallel and merges.
 */
export const DraftPartA = TechPackDraft.pick({ header: true, product: true, sizes: true, hat_base_intent: true, generic_poms: true });
export const DraftPartB = TechPackDraft.pick({ bom: true, construction: true });
export const DraftPartC = TechPackDraft.pick({ colorways: true, colorway_note_en: true, colorway_note_ar: true, labels: true, packaging: true, qc: true, assumptions: true, questions_for_factory: true });
export type DraftPartA = z.infer<typeof DraftPartA>;
export type DraftPartB = z.infer<typeof DraftPartB>;
export type DraftPartC = z.infer<typeof DraftPartC>;

export const DRAFT_PART_GUIDE = {
  A: "PART A ONLY: header, product (all EN/AR prose), sizes (mark the base size), and either hat_base_intent (bucket_hat template; generic_poms = null) or generic_poms (other templates; hat_base_intent = null).",
  B: "PART B ONLY: the complete bill of materials (fabric, interfacing if any, thread per use, labels, trims, packaging; refs F1.., T1.., L1.., P1..) and the construction block (standards + a numbered operation sheet with machine, ISO 4915 stitch, SPI, Arabic operation names).",
  C: "PART C ONLY: colorways (one entry per colorway with every coloured component, Pantone TCX + hex, needle/bobbin thread, label side), colorway note EN/AR, labels, packaging, QC, assumptions with impact, and questions for the factory.",
} as const;
