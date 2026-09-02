import type { TechPackDraft, VisionObservation } from "@/lib/ai/llm-schemas";
import type { GenerationOptions } from "@/lib/ai/stages";
import type { TechPack, Pom, SizeDef } from "@/lib/techpack/schema";
import { BUCKET_HAT_RULEBOOK as RB } from "@/lib/rulebook/bucket_hat";
import { deriveBucketHatPoms, defaultHatIntent, patternPiecesForBase, computeConsumption, type HatBaseIntent, type HatSize } from "@/lib/geometry/bucket_hat";
import { bucketHatFlats } from "@/lib/flats/bucket_hat";
import { MODELS } from "@/lib/ai/client";
import { PIPELINE_VERSION } from "./version";

export interface AssembleInput {
  packId: string;
  jobId: string;
  draft: TechPackDraft;
  observation: VisionObservation;
  templateId: string;
  options: GenerationOptions;
  description: string;
}

export type PartialPack = Omit<TechPack, "readiness" | "pipeline">;

const today = () => new Date().toISOString().slice(0, 10);

function inRange(v: number, lo: number, hi: number) {
  return Number.isFinite(v) && v >= lo && v <= hi;
}

function hatIntentFromDraft(d: TechPackDraft, extraAssumptions: { text_en: string; text_ar: string; impact: "low" | "medium" | "high" }[]): HatBaseIntent {
  const def = defaultHatIntent();
  const bi = d.hat_base_intent;
  if (!bi) {
    extraAssumptions.push({ text_en: "Base-size geometry taken entirely from the bucket-hat rulebook defaults (M = 59 cm inner circumference, 9 cm crown, 6.5 cm brim)", text_ar: "تم أخذ أبعاد المقاس الأساسي بالكامل من القيم الافتراضية لقبعة البكت (المقاس M = محيط داخلي 59 سم، تاج 9 سم، حافة 6.5 سم)", impact: "medium" });
    return def;
  }
  const pick = (key: keyof Omit<HatBaseIntent, "sources">, lo: number, hi: number, label: string) => {
    const s = bi[key as keyof typeof bi];
    if (s && inRange(s.value, lo, hi)) {
      def[key] = s.value;
      def.sources[key] = { source: s.source, confidence: s.confidence };
    } else if (s) {
      extraAssumptions.push({ text_en: `${label} proposed as ${s.value} was outside the plausible range ${lo}–${hi}; rulebook default ${def[key]} used instead`, text_ar: `القيمة المقترحة ${s.value} لـ ${label} خارج النطاق المعقول ${lo}–${hi}؛ تم استخدام القيمة الافتراضية ${def[key]}`, impact: "medium" });
    }
  };
  pick("inner_circumference_cm", 50, 66, "Inner circumference (M)");
  pick("crown_height_cm", 6, 14, "Crown height");
  pick("crown_height_grade_cm", 0, 1.5, "Crown height grade");
  pick("brim_width_cm", 3, 10, "Brim width");
  pick("band_taper_cm", 0, 6, "Band taper");
  pick("topstitch_offset_cm", 0.2, 2, "Topstitch offset");
  pick("topstitch_rows", 1, 6, "Topstitch rows");
  return def;
}

function sizesFromDraft(d: TechPackDraft, fallback: SizeDef[]): SizeDef[] {
  const s = d.sizes.filter((x) => x.code && x.label_en);
  if (s.length >= 3 && s.some((x) => x.is_base)) return s.map((x) => ({ code: x.code.toUpperCase(), label_en: x.label_en, label_ar: x.label_ar, fits_note_en: x.fits_note_en, is_base: x.is_base }));
  return fallback;
}

export function assembleTechPack(input: AssembleInput): PartialPack {
  const { packId, draft: d, observation: obs, templateId, options } = input;
  const assumptions = [...d.assumptions];
  const isHat = templateId === "bucket_hat";

  const rbSizes: SizeDef[] = RB.sizes.map((s) => ({ code: s.code, label_en: s.label_en, label_ar: s.label_ar, fits_note_en: `Fits head ${s.head_girth_range_cm} cm`, is_base: s.code === RB.base_size }));
  const sizes = isHat ? rbSizes.map((rb) => ({ ...rb, ...(d.sizes.find((x) => x.code.toUpperCase() === rb.code) ? { label_ar: d.sizes.find((x) => x.code.toUpperCase() === rb.code)!.label_ar || rb.label_ar } : {}) })) : sizesFromDraft(d, rbSizes);
  const baseIdx = Math.max(0, sizes.findIndex((s) => s.is_base));
  const base = sizes[baseIdx];

  let poms: Pom[] = [];
  let pattern_pieces: PartialPack["pattern_pieces"] = [];
  let consumption: PartialPack["consumption"];
  let flats: PartialPack["flats"] = [];

  const fabricColours = (() => {
    const fabricRefs = new Set(d.bom.filter((b) => b.category === "fabric").map((b) => b.ref));
    const names = new Set<string>();
    for (const cw of d.colorways) for (const c of cw.components) if (fabricRefs.has(c.bom_ref) || fabricRefs.size === 0) names.add(c.colour_name);
    return names.size ? [...names] : RB.colour_refs.map((c) => c.name);
  })();

  if (isHat) {
    const intent = hatIntentFromDraft(d, assumptions);
    const hatSizes: HatSize[] = sizes.map((s, i) => ({ code: s.code, offset_from_base: i - baseIdx }));
    const g = deriveBucketHatPoms(intent, hatSizes);
    poms = g.poms;
    const pieces = patternPiecesForBase(g, base.code);
    pattern_pieces = pieces.map(({ net_area_cm2, ...p }) => ({ ...p, notes_en: `${p.notes_en} Net cut area ${net_area_cm2} cm² per shell.` }));
    const fabric = d.bom.find((b) => b.category === "fabric");
    consumption = computeConsumption(pieces, fabricColours, {
      gsm: fabric?.weight_gsm ?? undefined,
      widthCm: fabric?.width_cm ?? undefined,
      usableWidthCm: fabric?.width_cm ? fabric.width_cm - 3 : undefined,
      runQuantity: options.runQuantity,
    });
    flats = bucketHatFlats(g, base.code);
  } else {
    const gp = d.generic_poms ?? [];
    poms = gp.map((p) => ({
      code: p.code,
      name_en: p.name_en,
      name_ar: p.name_ar,
      how_to_measure_en: p.how_to_measure_en,
      how_to_measure_ar: p.how_to_measure_ar,
      values: Object.fromEntries(sizes.map((s, i) => [s.code, Math.round((p.base_value_cm + (i - baseIdx) * p.grade_cm) * 10) / 10])),
      tolerance_cm: p.tolerance_cm,
      derivation: `${p.code}(${base.code}) = ${p.base_value_cm} cm; grade ${p.grade_cm} cm per size`,
      source: p.source,
      confidence: p.confidence,
    }));
    consumption = {
      fabric_width_cm: 150,
      usable_width_cm: 147,
      marker_efficiency: 0,
      shrinkage_allowance_pct: 3,
      per_unit: [],
      formulas_en: ["Consumption is only computed by formula for templated products (bucket hat). Factory to confirm from marker."],
      run_quantity: options.runQuantity,
      run_totals_m: null,
      buying_per_unit_m: 0,
    };
    assumptions.push({ text_en: "No parametric sketch template exists yet for this product family; flats must be supplied by the buyer or drawn by the factory sample room", text_ar: "لا يوجد قالب رسم فني لهذه الفئة بعد؛ يجب توفير الرسومات من المشتري أو غرفة العينات بالمصنع", impact: "high" });
  }

  const bomRefs = new Set<string>();
  const bom = d.bom.map((b, i) => {
    let ref = b.ref || `X${i + 1}`;
    while (bomRefs.has(ref)) ref = `${ref}'`;
    bomRefs.add(ref);
    const row = { ...b, ref, supplier: b.supplier || "TBC by factory" };
    // The computed consumption is authoritative for shell fabric quantities.
    if (isHat && row.category === "fabric" && consumption.buying_per_unit_m > 0) {
      const perUnit = consumption.per_unit.find((c) => `${row.item_en} ${row.colour_rule_en}`.toLowerCase().includes(c.colour.toLowerCase().replace(/^jet /, "")));
      if (perUnit) {
        row.qty_per_unit = consumption.buying_per_unit_m;
        row.unit = "m";
        row.notes_en = `${row.notes_en ? `${row.notes_en} ` : ""}Buying qty ${consumption.buying_per_unit_m} m/hat (planning ${perUnit.metres_per_unit} m/hat), computed from the cut sheet.`;
        row.source = "derived";
        row.confidence = "high";
      }
    }
    return row;
  });

  const stdSrc = d.construction.standards;
  const intentRows = isHat ? (d.hat_base_intent?.topstitch_rows.value ?? RB.defaults.topstitch_rows) : 1;
  const intentOffset = isHat ? poms.find((p) => p.code === "G")?.values[base.code] ?? RB.defaults.topstitch_offset_cm : 0.6;
  const operations = d.construction.operations.length >= 8 ? d.construction.operations : isHat ? RB.operations.map((o) => ({ ...o, notes_ar: "" })) : d.construction.operations;
  if (isHat && d.construction.operations.length < 8) {
    assumptions.push({ text_en: "Operation sheet taken from the rulebook because the draft was incomplete", text_ar: "تم أخذ جدول العمليات من دليل القواعد لأن المسودة كانت غير مكتملة", impact: "low" });
  }

  // Fixed colour dictionary: the model may not invent Pantone codes for the rulebook colours
  const dict = RB.colour_refs;
  const norm = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
  // Colorway components are generated in parallel with the BOM, so re-point each
  // component at the BOM line that actually carries its colour and role.
  const catOf = (text: string): string | null => (/thread|needle|bobbin/i.test(text) ? "thread" : /label|hangtag/i.test(text) ? "label" : /shell|fabric|brim|crown|band/i.test(text) ? "fabric" : null);
  const resolveRef = (component: string, colour: string, ref: string): string => {
    const cat = catOf(component);
    if (!cat) return ref;
    const col = colour.toLowerCase().replace(/^jet /, "");
    const wantsTop = /topstitch|needle|bobbin/i.test(component);
    const wantsHangtag = /hangtag/i.test(component);
    const wantsCare = /care|content|size/i.test(component);
    const candidates = bom.filter((b) => (cat === "label" ? b.category === "label" || b.category === "trim" : b.category === cat) || (cat === "fabric" && b.category === "fabric"));
    const scored = candidates
      .map((b) => {
        const hay = `${b.item_en} ${b.colour_rule_en} ${b.description_en}`.toLowerCase();
        let score = 0;
        if (hay.includes(col)) score += 3;
        if (cat === "thread") score += (/topstitch/i.test(hay) === wantsTop ? 2 : -2);
        if (cat === "label") score += wantsHangtag ? (/hangtag/i.test(hay) ? 2 : -2) : wantsCare ? (/care|content/i.test(hay) ? 2 : -2) : (/brand|main|woven/i.test(hay) ? 2 : -1);
        if (b.ref === ref) score += 1;
        return { b, score };
      })
      .sort((x, y) => y.score - x.score);
    return scored.length && scored[0].score >= 3 ? scored[0].b.ref : ref;
  };
  const colorwaysRaw = d.colorways.map((cw) => ({
    ...cw,
    components: cw.components.map((c) => {
      const hit = dict.find((r) => norm(c.colour_name).includes(norm(r.name).replace("jet", "")) || norm(r.name).includes(norm(c.colour_name)));
      const cleaned = c.bom_ref.replace(/[^A-Za-z0-9]/g, "").replace(/^([A-Z])0+(\d)/, "$1$2").toUpperCase();
      const colour_name = hit ? hit.name : c.colour_name;
      const bom_ref = resolveRef(c.component_en, colour_name, cleaned);
      return hit ? { ...c, bom_ref, colour_name, pantone_tcx: hit.pantone_tcx, hex: hit.hex } : { ...c, bom_ref };
    }),
  }));
  // Thread prose must cite the same refs as the resolved needle/bobbin components.
  const colorways = colorwaysRaw.map((cw) => {
    const needleRef = cw.components.find((c) => /needle/i.test(c.component_en))?.bom_ref;
    const bobbinRef = cw.components.find((c) => /bobbin/i.test(c.component_en))?.bom_ref;
    const fix = (text: string, ref: string | undefined) => {
      if (!ref) return text;
      const cleaned = text.replace(/\b[A-Z]-?0?\d+\b/g, (m) => (/^T/.test(m) ? ref : m));
      return cleaned.includes(ref) ? cleaned : `${ref} — ${cleaned}`;
    };
    return { ...cw, thread_needle: fix(cw.thread_needle, needleRef), thread_bobbin: fix(cw.thread_bobbin, bobbinRef) };
  });
  const labels = d.labels.length ? d.labels : isHat ? RB.labels.map((l) => ({ ...l })) : [];

  const partial: PartialPack = {
    meta: {
      id: packId,
      version: "1.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      template_id: templateId,
      generator: { primary_model: MODELS.primary, pipeline_version: PIPELINE_VERSION },
    },
    header: {
      style_number: options.styleNumber,
      style_name_en: d.header.style_name_en,
      style_name_ar: d.header.style_name_ar,
      brand: options.brand || "TBC",
      season: d.header.season || options.season,
      category_en: d.header.category_en,
      category_ar: d.header.category_ar,
      product_type_en: d.header.product_type_en,
      product_type_ar: d.header.product_type_ar,
      base_size: base.code,
      units: "cm",
      date: today(),
      status: "draft",
    },
    product: {
      ...d.product,
      reference_observations_en: [...obs.silhouette_notes, ...obs.construction_cues, ...(obs.text_in_image.length ? [`Text on reference: ${obs.text_in_image.join(" | ")}`] : [])],
    },
    sizes,
    poms,
    pattern_pieces,
    bom,
    construction: {
      standards: {
        stitch_type: stdSrc.stitch_type || RB.stitching.stitch_type,
        seam_type: stdSrc.seam_type || RB.stitching.seam_type,
        spi_seam: stdSrc.spi_seam || RB.stitching.spi_seam,
        spi_topstitch: stdSrc.spi_topstitch || RB.stitching.spi_topstitch,
        seam_allowance_cm: stdSrc.seam_allowance_cm || RB.defaults.seam_allowance_cm,
        topstitch_offset_cm: intentOffset,
        topstitch_rows: intentRows,
        needle: stdSrc.needle || RB.thread.seaming.needle,
        thread_seaming: stdSrc.thread_seaming || RB.thread.seaming.spec,
        thread_topstitch: stdSrc.thread_topstitch || RB.thread.topstitch.spec,
        interfacing_en: stdSrc.interfacing_en || RB.stitching.interfacing_en,
        pressing_en: stdSrc.pressing_en || RB.stitching.pressing_en,
      },
      operations,
      sam_estimate_min: d.construction.sam_estimate_min ?? (isHat ? RB.sam_estimate_min : null),
      sam_note_en: d.construction.sam_note_en || (isHat ? RB.sam_note_en : ""),
      special_notes_en: d.construction.special_notes_en.length ? d.construction.special_notes_en : isHat ? [...RB.reversible_notes_en] : [],
      special_notes_ar: d.construction.special_notes_ar,
    },
    colorways,
    colorway_note_en: d.colorway_note_en || (isHat ? RB.reversible_notes_en[1] : ""),
    colorway_note_ar: d.colorway_note_ar,
    labels,
    packaging: d.packaging.method_en ? d.packaging : isHat ? { ...RB.packaging, items_en: [...RB.packaging.items_en] } : d.packaging,
    qc: d.qc.aql_en ? d.qc : isHat ? { aql_en: RB.qc.aql_en, checks_en: [...RB.qc.checks_en], checks_ar: [...RB.qc.checks_ar], tests_en: [...RB.qc.tests_en] } : d.qc,
    consumption,
    flats,
    assumptions,
    questions_for_factory: d.questions_for_factory,
    revision_log: [{ version: "1.0", date: today(), author: "Masdr Tech Pack AI", change_en: "Initial generation from reference image and buyer description" }],
  };
  return partial;
}
