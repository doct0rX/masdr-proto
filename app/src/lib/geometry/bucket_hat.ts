import { BUCKET_HAT_RULEBOOK as RB } from "@/lib/rulebook/bucket_hat";
import type { Pom, Confidence, Provenance } from "@/lib/techpack/schema";

/**
 * All graded bucket-hat measurements are derived from the base-size inner
 * circumference. The model proposes base-size intent (with provenance); this
 * module computes every number and keeps the formula next to it.
 *
 * Brim geometry: the brim is drafted as a 30° cone (drop angle from horizontal),
 * so the finished outer edge circumference is A + 2π·C·cos30° and the pattern
 * piece is a cone sector with slant inner radius A/(2π·cos30°).
 */

export interface HatBaseIntent {
  inner_circumference_cm: number;
  crown_height_cm: number;
  crown_height_grade_cm: number;
  brim_width_cm: number;
  band_taper_cm: number;
  topstitch_offset_cm: number;
  topstitch_rows: number;
  sources: Partial<Record<keyof Omit<HatBaseIntent, "sources">, { source: Provenance; confidence: Confidence }>>;
}

export interface HatSize {
  code: string;
  offset_from_base: number; // -1 for S, 0 for M, +1 for L
}

export const DEFAULT_HAT_SIZES: HatSize[] = [
  { code: "S", offset_from_base: -1 },
  { code: "M", offset_from_base: 0 },
  { code: "L", offset_from_base: 1 },
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
export const BRIM_DROP_RAD = (RB.defaults.brim_drop_deg * Math.PI) / 180;
export const COS_DROP = Math.cos(BRIM_DROP_RAD);

export function defaultHatIntent(): HatBaseIntent {
  const d = RB.defaults;
  const base = RB.sizes.find((s) => s.code === RB.base_size)!;
  return {
    inner_circumference_cm: base.finished_inner_circumference_cm,
    crown_height_cm: d.crown_height_cm,
    crown_height_grade_cm: d.crown_height_grade_cm,
    brim_width_cm: d.brim_width_cm,
    band_taper_cm: d.band_taper_cm,
    topstitch_offset_cm: d.topstitch_offset_cm,
    topstitch_rows: d.topstitch_rows,
    sources: {},
  };
}

export type HatValues = { A: number; B: number; C: number; D: number; E: number; F: number; G: number; H: number; J: number; W: number };

export interface DerivedHatGeometry {
  poms: Pom[];
  perSize: Record<string, HatValues>;
  base: HatBaseIntent;
}

export function deriveBucketHatPoms(intent: HatBaseIntent, sizes: HatSize[] = DEFAULT_HAT_SIZES): DerivedHatGeometry {
  const grade = RB.defaults.circumference_grade_cm;
  const perSize: DerivedHatGeometry["perSize"] = {};
  for (const s of sizes) {
    const A = r1(intent.inner_circumference_cm + s.offset_from_base * grade);
    const B = r1(intent.crown_height_cm + s.offset_from_base * intent.crown_height_grade_cm);
    const C = r1(intent.brim_width_cm + s.offset_from_base * RB.defaults.brim_width_grade_cm);
    const H = r1(A - intent.band_taper_cm);
    const D = r1(H / Math.PI);
    const F = r1(A + 2 * Math.PI * C * COS_DROP);
    const E = r1(B + C);
    const G = intent.topstitch_offset_cm;
    const J = RB.defaults.label_below_tip_seam_cm;
    const W = r1(A / Math.PI + 2 * C * COS_DROP);
    perSize[s.code] = { A, B, C, D, E, F, G, H, J, W };
  }
  const src = (k: keyof HatBaseIntent["sources"]): { source: Provenance; confidence: Confidence } =>
    intent.sources[k] ?? { source: "default", confidence: "medium" };
  const val = (code: keyof HatValues) => Object.fromEntries(sizes.map((s) => [s.code, perSize[s.code][code]]));
  const n = RB.pom_names;
  const row = (code: keyof HatValues, derivation: string, prov: { source: Provenance; confidence: Confidence }): Pom => ({
    code,
    name_en: n[code].en,
    name_ar: n[code].ar,
    how_to_measure_en: n[code].how_en,
    how_to_measure_ar: n[code].how_ar,
    values: val(code),
    tolerance_cm: RB.tolerances_cm[code],
    derivation,
    ...prov,
  });
  const poms: Pom[] = [
    row("A", `A(M) = head girth max (${intent.inner_circumference_cm - RB.defaults.ease_cm}) + ${RB.defaults.ease_cm} cm ease; grade ±${grade} cm per size`, src("inner_circumference_cm")),
    row("B", `B(M) = ${intent.crown_height_cm} cm; grade ±${intent.crown_height_grade_cm} cm per size`, src("crown_height_cm")),
    row("C", `C = ${intent.brim_width_cm} cm, constant across sizes`, src("brim_width_cm")),
    row("H", `H = A − band taper (${intent.band_taper_cm} cm)`, { source: "derived", confidence: src("band_taper_cm").confidence }),
    row("D", "D = H / π", { source: "derived", confidence: "high" }),
    row("E", "E = B + C (flat, brim extended; check POM)", { source: "derived", confidence: "high" }),
    row("F", `F = A + 2π·C·cos${RB.defaults.brim_drop_deg}° (brim drafted as a ${RB.defaults.brim_drop_deg}° cone)`, { source: "derived", confidence: "high" }),
    row("W", `W = A/π + 2·C·cos${RB.defaults.brim_drop_deg}° (check POM on head form)`, { source: "derived", confidence: "high" }),
    row("G", `G = ${intent.topstitch_offset_cm} cm, ${intent.topstitch_rows} row(s)`, src("topstitch_offset_cm")),
    row("J", `J = ${RB.defaults.label_below_tip_seam_cm} cm, constant`, { source: "default", confidence: "high" }),
  ];
  return { poms, perSize, base: intent };
}

export interface PatternPieceDims {
  name_en: string;
  name_ar: string;
  qty_per_shell: number;
  qty_total: number;
  cut_dimensions_base_en: string;
  notes_en: string;
  net_area_cm2: number; // per shell, including seam allowance
}

export function patternPiecesForBase(g: DerivedHatGeometry, baseCode = "M"): PatternPieceDims[] {
  const sa = RB.defaults.seam_allowance_cm;
  const m = g.perSize[baseCode];
  const tipCutDia = m.D + 2 * sa;
  const tipArea = Math.PI * (tipCutDia / 2) ** 2;
  const bandBottom = m.A / 2 + 2 * sa;
  const bandTop = m.H / 2 + 2 * sa;
  const bandHeight = m.B + 2 * sa;
  const bandArea = ((bandBottom + bandTop) / 2) * bandHeight * 2;
  // developed cone: slant inner radius, sector angle = 360° · cos(drop)
  const rInSlant = m.A / (2 * Math.PI * COS_DROP);
  const rIn = rInSlant - sa;
  const rOut = rInSlant + m.C + sa;
  const sectorFrac = COS_DROP; // fraction of a full annulus
  const brimArea = Math.PI * (rOut ** 2 - rIn ** 2) * sectorFrac + 2 * sa * (rOut - rIn) * 2; // + straight-end SAs
  const p = RB.pattern_pieces;
  return [
    {
      name_en: p[0].name_en, name_ar: p[0].name_ar, qty_per_shell: 1, qty_total: 2,
      cut_dimensions_base_en: `Circle Ø ${r1(tipCutDia)} cm (finished Ø ${m.D})`,
      notes_en: p[0].notes_en, net_area_cm2: r1(tipArea),
    },
    {
      name_en: p[1].name_en, name_ar: p[1].name_ar, qty_per_shell: 2, qty_total: 4,
      cut_dimensions_base_en: `Trapezoid: bottom ${r1(bandBottom)} cm, top ${r1(bandTop)} cm, height ${r1(bandHeight)} cm`,
      notes_en: p[1].notes_en, net_area_cm2: r1(bandArea),
    },
    {
      name_en: p[2].name_en, name_ar: p[2].name_ar, qty_per_shell: 2, qty_total: 4,
      cut_dimensions_base_en: `Cone sector: inner R ${r1(rIn)} cm, outer R ${r1(rOut)} cm, ${r1((360 * sectorFrac) / 2)}° per half (+1 cm SA on straight ends)`,
      notes_en: p[2].notes_en, net_area_cm2: r1(brimArea),
    },
  ];
}

export interface ConsumptionResult {
  fabric_width_cm: number;
  usable_width_cm: number;
  marker_efficiency: number;
  shrinkage_allowance_pct: number;
  per_unit: { colour: string; net_area_cm2: number; gross_area_cm2: number; metres_per_unit: number; grams_per_unit: number }[];
  formulas_en: string[];
  run_quantity: number | null;
  run_totals_m: { colour: string; metres: number }[] | null;
  buying_per_unit_m: number;
}

export function computeConsumption(
  pieces: PatternPieceDims[],
  colours: string[],
  opts: { gsm?: number; widthCm?: number; usableWidthCm?: number; efficiency?: number; shrinkagePct?: number; runQuantity?: number | null } = {},
): ConsumptionResult {
  const gsm = opts.gsm ?? RB.fabric.gsm;
  const width = opts.widthCm ?? RB.fabric.width_cm;
  const usable = opts.usableWidthCm ?? RB.fabric.usable_width_cm;
  const eff = opts.efficiency ?? RB.fabric.marker_efficiency;
  const shrink = opts.shrinkagePct ?? RB.fabric.shrinkage_allowance_pct;
  const buying = RB.fabric.buying_allowance_pct;
  const netPerShell = pieces.reduce((acc, p) => acc + p.net_area_cm2, 0);
  const gross = netPerShell / eff;
  const metres = r2((gross / usable / 100) * (1 + shrink / 100));
  const buyingPerUnit = Math.ceil(metres * (1 + buying / 100) * 100) / 100;
  const grams = (netPerShell / 10000) * gsm;
  const per_unit = colours.map((colour) => ({
    colour,
    net_area_cm2: r1(netPerShell),
    gross_area_cm2: r1(gross),
    metres_per_unit: r2(metres),
    grams_per_unit: r1(grams),
  }));
  const runQ = opts.runQuantity ?? null;
  return {
    fabric_width_cm: width,
    usable_width_cm: usable,
    marker_efficiency: eff,
    shrinkage_allowance_pct: shrink,
    per_unit,
    formulas_en: [
      `Net area per shell = Σ pattern pieces incl. 1 cm SA = ${r1(netPerShell)} cm²`,
      `Gross area = net ÷ marker efficiency (${eff}) = ${r1(gross)} cm²`,
      `Metres per hat per colour (planning) = gross ÷ usable width (${usable} cm) × (1 + ${shrink}% shrinkage) = ${r2(metres)} m`,
      `Buying quantity = planning × (1 + ${buying}% for lot shading, end losses and shrinkage variance), rounded up = ${buyingPerUnit} m per hat per colour (this is the BOM figure)`,
      `Run total per colour = buying quantity × run quantity${runQ ? ` = ${buyingPerUnit} × ${runQ} = ${r1(buyingPerUnit * runQ)} m` : ""}`,
      `Fabric weight per shell = net area × ${gsm} gsm = ${r1(grams)} g`,
      "One reversible hat consumes one shell of EACH colour; both colorways use identical quantities, so pool the fabric order across colorways",
    ],
    run_quantity: runQ,
    run_totals_m: runQ ? colours.map((colour) => ({ colour, metres: r1(buyingPerUnit * runQ) })) : null,
    buying_per_unit_m: buyingPerUnit,
  };
}
