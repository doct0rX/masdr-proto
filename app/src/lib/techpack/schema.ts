import { z } from "zod";

/**
 * Final tech pack document. Built in code from LLM drafts + rulebook + geometry.
 * Every AI-influenced row carries provenance so the factory can see what was
 * measured from the image, stated by the buyer, derived by formula, or defaulted.
 */

export const Provenance = z.enum(["measured", "stated", "derived", "default", "inferred"]);
export type Provenance = z.infer<typeof Provenance>;

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

export const SizeDef = z.object({
  code: z.string(),
  label_en: z.string(),
  label_ar: z.string(),
  fits_note_en: z.string().nullable(),
  is_base: z.boolean(),
});
export type SizeDef = z.infer<typeof SizeDef>;

export const Pom = z.object({
  code: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  how_to_measure_en: z.string(),
  how_to_measure_ar: z.string(),
  values: z.record(z.string(), z.number()),
  tolerance_cm: z.number(),
  derivation: z.string(),
  source: Provenance,
  confidence: Confidence,
});
export type Pom = z.infer<typeof Pom>;

export const BomCategory = z.enum([
  "fabric",
  "interfacing",
  "thread",
  "label",
  "trim",
  "hardware",
  "packaging",
  "other",
]);
export type BomCategory = z.infer<typeof BomCategory>;

export const BomItem = z.object({
  ref: z.string(),
  category: BomCategory,
  item_en: z.string(),
  item_ar: z.string(),
  description_en: z.string(),
  composition: z.string().nullable(),
  weight_gsm: z.number().nullable(),
  width_cm: z.number().nullable(),
  placement_en: z.string(),
  placement_ar: z.string(),
  qty_per_unit: z.number(),
  unit: z.string(),
  colour_rule_en: z.string(),
  supplier: z.string(),
  notes_en: z.string().nullable(),
  source: Provenance,
  confidence: Confidence,
});
export type BomItem = z.infer<typeof BomItem>;

export const Operation = z.object({
  step: z.number(),
  operation_en: z.string(),
  operation_ar: z.string(),
  machine: z.string(),
  stitch: z.string(),
  spi: z.string(),
  notes_en: z.string(),
  notes_ar: z.string(),
});
export type Operation = z.infer<typeof Operation>;

export const ConstructionStandards = z.object({
  stitch_type: z.string(),
  seam_type: z.string(),
  spi_seam: z.string(),
  spi_topstitch: z.string(),
  seam_allowance_cm: z.number(),
  topstitch_offset_cm: z.number(),
  topstitch_rows: z.number(),
  needle: z.string(),
  thread_seaming: z.string(),
  thread_topstitch: z.string(),
  interfacing_en: z.string(),
  pressing_en: z.string(),
});
export type ConstructionStandards = z.infer<typeof ConstructionStandards>;

export const ColorComponent = z.object({
  component_en: z.string(),
  component_ar: z.string(),
  colour_name: z.string(),
  pantone_tcx: z.string(),
  hex: z.string(),
  bom_ref: z.string(),
});

export const Colorway = z.object({
  code: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  components: z.array(ColorComponent),
  thread_needle: z.string(),
  thread_bobbin: z.string(),
  label_side_en: z.string(),
  label_side_ar: z.string(),
  notes_en: z.string(),
});
export type Colorway = z.infer<typeof Colorway>;

export const LabelSpec = z.object({
  type: z.string(),
  placement_en: z.string(),
  placement_ar: z.string(),
  content_en: z.string(),
  content_ar: z.string(),
  notes_en: z.string(),
});

export const ConsumptionLine = z.object({
  colour: z.string(),
  net_area_cm2: z.number(),
  gross_area_cm2: z.number(),
  metres_per_unit: z.number(),
  grams_per_unit: z.number(),
});

export const Consumption = z.object({
  fabric_width_cm: z.number(),
  usable_width_cm: z.number(),
  marker_efficiency: z.number(),
  shrinkage_allowance_pct: z.number(),
  per_unit: z.array(ConsumptionLine),
  formulas_en: z.array(z.string()),
  run_quantity: z.number().nullable(),
  run_totals_m: z.array(z.object({ colour: z.string(), metres: z.number() })).nullable(),
  buying_per_unit_m: z.number().default(0),
});

export const FlatView = z.object({
  id: z.string(),
  title_en: z.string(),
  title_ar: z.string(),
  svg: z.string(),
  pom_codes: z.array(z.string()),
});

export const Assumption = z.object({
  text_en: z.string(),
  text_ar: z.string(),
  impact: z.enum(["low", "medium", "high"]),
});

export const ReadinessCheck = z.object({
  item_en: z.string(),
  pass: z.boolean(),
  note_en: z.string(),
});

export const StageRecord = z.object({
  name: z.string(),
  kind: z.enum(["llm", "code"]),
  model: z.string().nullable(),
  ms: z.number(),
  input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
  cache_read_tokens: z.number().nullable(),
  cost_usd: z.number().nullable(),
  note: z.string().nullable(),
});

export const CritiqueIssue = z.object({
  section: z.string(),
  issue: z.string(),
  fix: z.string(),
  severity: z.enum(["blocking", "warning"]),
});

export const CritiqueReport = z.object({
  factory_readiness_score: z.number(),
  verdict: z.enum(["pass", "repair"]),
  issues: z.array(CritiqueIssue),
  strengths: z.array(z.string()),
});
export type CritiqueReport = z.infer<typeof CritiqueReport>;

export const TechPack = z.object({
  meta: z.object({
    id: z.string(),
    version: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    template_id: z.string(),
    generator: z.object({ primary_model: z.string(), pipeline_version: z.string() }),
  }),
  header: z.object({
    style_number: z.string(),
    style_name_en: z.string(),
    style_name_ar: z.string(),
    brand: z.string(),
    season: z.string(),
    category_en: z.string(),
    category_ar: z.string(),
    product_type_en: z.string(),
    product_type_ar: z.string(),
    base_size: z.string(),
    units: z.literal("cm"),
    date: z.string(),
    status: z.enum(["draft", "reviewed", "approved"]),
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
    reference_observations_en: z.array(z.string()),
  }),
  sizes: z.array(SizeDef),
  poms: z.array(Pom),
  pattern_pieces: z.array(
    z.object({
      name_en: z.string(),
      name_ar: z.string(),
      qty_per_shell: z.number(),
      qty_total: z.number(),
      cut_dimensions_base_en: z.string(),
      notes_en: z.string(),
    }),
  ),
  bom: z.array(BomItem),
  construction: z.object({
    standards: ConstructionStandards,
    operations: z.array(Operation),
    sam_estimate_min: z.number().nullable(),
    sam_note_en: z.string(),
    special_notes_en: z.array(z.string()),
    special_notes_ar: z.array(z.string()),
  }),
  colorways: z.array(Colorway),
  colorway_note_en: z.string(),
  colorway_note_ar: z.string(),
  labels: z.array(LabelSpec),
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
  consumption: Consumption,
  flats: z.array(FlatView),
  assumptions: z.array(Assumption),
  questions_for_factory: z.array(z.object({ text_en: z.string(), text_ar: z.string() })),
  readiness: z.object({ score: z.number(), checks: z.array(ReadinessCheck) }),
  revision_log: z.array(
    z.object({ version: z.string(), date: z.string(), author: z.string(), change_en: z.string() }),
  ),
  pipeline: z.object({
    stages: z.array(StageRecord),
    critique: CritiqueReport.nullable(),
    validation: z.object({ errors: z.array(z.string()), warnings: z.array(z.string()) }),
    total_cost_usd: z.number().nullable(),
    total_ms: z.number(),
  }),
});
export type TechPack = z.infer<typeof TechPack>;
