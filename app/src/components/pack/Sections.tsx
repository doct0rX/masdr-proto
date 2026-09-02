import type { ReactNode } from "react";
import type { TechPack } from "@/lib/techpack/schema";
import { t, type Lang } from "@/lib/i18n/strings";

/* ---------- helpers ---------- */

export function Bi({ en, ar, lang, inline = false, muted = true }: { en: string; ar?: string | null; lang: Lang; inline?: boolean; muted?: boolean }) {
  const primary = lang === "ar" && ar ? ar : en;
  const secondary = lang === "ar" && ar ? en : ar;
  const pClass = lang === "ar" && ar ? "ar" : "en";
  const sClass = lang === "ar" && ar ? "en" : "ar";
  if (!secondary) return <span className={pClass}>{primary}</span>;
  return inline ? (
    <span>
      <span className={pClass}>{primary}</span> <span className={`${sClass} ${muted ? "text-muted" : ""}`}>· {secondary}</span>
    </span>
  ) : (
    <span className="block">
      <span className={`${pClass} block`}>{primary}</span>
      <span className={`${sClass} block text-[0.92em] ${muted ? "text-muted" : ""}`}>{secondary}</span>
    </span>
  );
}

export function Section({ id, title, subtitle, children, print, actions }: { id: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; print?: boolean; actions?: ReactNode }) {
  return (
    <section id={id} className={print ? "print-page" : "card p-6 md:p-8 scroll-mt-24"}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-heading">{title}</h2>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="no-print flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function ProvBadge({ source, confidence, lang }: { source: string; confidence: string; lang: Lang }) {
  const s = t(lang);
  const label = (s as unknown as Record<string, string>)[`provenance_${source}`] ?? source;
  const tone = confidence === "high" ? "bg-emerald-50 text-emerald-700" : confidence === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`} title={`${source} · ${confidence}`}>
      {label}
    </span>
  );
}

/* ---------- sections ---------- */

export function CoverSection({ pack, lang, print, imageUrl }: { pack: TechPack; lang: Lang; print?: boolean; imageUrl?: string | null }) {
  const s = t(lang);
  const h = pack.header;
  return (
    <Section id="cover" print={print} title={<Bi en={h.style_name_en} ar={h.style_name_ar} lang={lang} inline muted={false} />} subtitle={`${h.brand} · ${h.style_number} · ${h.season} · v${pack.meta.version} · ${h.date}`}>
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          {[
            [s.form_brand, h.brand],
            [s.form_style, h.style_number],
            [s.form_season, h.season],
            ["Category", <Bi key="c" en={h.category_en} ar={h.category_ar} lang={lang} inline />],
            ["Product type", <Bi key="p" en={h.product_type_en} ar={h.product_type_ar} lang={lang} inline />],
            ["Base size / units", `${h.base_size} / cm`],
            ["Template", pack.meta.template_id],
            ["Status", <span key="st" className={`badge ${h.status === "draft" ? "badge-soft" : "badge-verified"}`}>{h.status}</span>],
            [s.readiness, <span key="r" className={`badge ${pack.readiness.score >= 85 ? "badge-verified" : pack.readiness.score >= 65 ? "badge-ready" : "badge-flash"}`}>{pack.readiness.score}/100</span>],
          ].map(([k, v], i) => (
            <div key={i}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
              <dd className="mt-0.5 text-heading">{v}</dd>
            </div>
          ))}
        </dl>
        {imageUrl && (
          <figure className="panel p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Reference" className="w-full rounded-xl object-contain bg-white" />
            <figcaption className="mt-2 text-[11px] text-muted">Reference supplied by buyer</figcaption>
          </figure>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {pack.colorways.map((cw) => (
          <div key={cw.code} className="panel flex items-center gap-3 px-3 py-2">
            <div className="flex -space-x-1">
              {cw.components.slice(0, 3).map((c, i) => (
                <span key={i} className="swatch" style={{ background: c.hex }} title={`${c.component_en}: ${c.colour_name} ${c.pantone_tcx}`} />
              ))}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-heading">{cw.code}</div>
              <Bi en={cw.name_en} ar={cw.name_ar} lang={lang} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ProductSection({ pack, lang, print, actions }: { pack: TechPack; lang: Lang; print?: boolean; actions?: ReactNode }) {
  const s = t(lang);
  const p = pack.product;
  return (
    <Section id="product" print={print} title={s.sec_product} actions={actions}>
      <div className="grid gap-5 md:grid-cols-2 text-sm">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Description</h3>
          <Bi en={p.description_en} ar={p.description_ar} lang={lang} />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Intended use</h3>
          <Bi en={p.intended_use_en} ar={p.intended_use_ar} lang={lang} />
          <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Fit intent</h3>
          <Bi en={p.fit_intent_en} ar={p.fit_intent_ar} lang={lang} />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Key features</h3>
          <ul className="list-disc ps-5 space-y-0.5">
            {p.key_features_en.map((f, i) => (
              <li key={i}>
                <Bi en={f} ar={p.key_features_ar[i]} lang={lang} inline />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Observed on the reference</h3>
          <ul className="list-disc ps-5 space-y-0.5 text-body">
            {p.reference_observations_en.slice(0, 10).map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function FlatsSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  if (pack.flats.length === 0) {
    return (
      <Section id="flats" print={print} title={s.sec_flats}>
        <p className="text-sm text-muted">No parametric flat template for this product family. See assumptions.</p>
      </Section>
    );
  }
  return (
    <Section id="flats" print={print} title={s.sec_flats} subtitle={`Base size ${pack.header.base_size} · dimension-true · badges are POM codes`}>
      <div className="grid gap-4 md:grid-cols-3">
        {pack.flats.map((f) => (
          <figure key={f.id} className="panel p-3">
            <div dangerouslySetInnerHTML={{ __html: f.svg }} />
            <figcaption className="mt-2 text-xs font-semibold text-heading">
              <Bi en={f.title_en} ar={f.title_ar} lang={lang} inline />
            </figcaption>
          </figure>
        ))}
      </div>
      <ul className="mt-4 grid gap-1 text-xs text-body sm:grid-cols-2 md:grid-cols-4">
        {pack.poms.map((p) => (
          <li key={p.code}>
            <span className="num font-bold text-brand-500">{p.code}</span> <Bi en={p.name_en} ar={p.name_ar} lang={lang} inline />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function PomSection({ pack, lang, print, editing, draftValues, onChange, actions }: { pack: TechPack; lang: Lang; print?: boolean; editing?: boolean; draftValues?: Record<string, number>; onChange?: (code: string, v: number) => void; actions?: ReactNode }) {
  const s = t(lang);
  const sizes = pack.sizes.map((z) => z.code);
  const base = pack.header.base_size;
  return (
    <Section id="poms" print={print} title={s.sec_poms} subtitle={`Finished cm · tolerance ± · ${pack.sizes.map((z) => `${z.code}${z.fits_note_en ? ` (${z.fits_note_en.replace("Fits head ", "")})` : ""}`).join(" · ")}`} actions={actions}>
      <div className="overflow-x-auto">
        <table className="spec-table">
          <thead>
            <tr>
              <th>{s.code}</th>
              <th>{s.pom}</th>
              <th className="min-w-56">{s.how_to_measure}</th>
              {sizes.map((z) => (
                <th key={z} className={`num ${z === base ? "text-brand-700" : ""}`}>
                  {z}
                </th>
              ))}
              <th className="num">{s.tolerance}</th>
              <th>{s.derivation}</th>
              <th>{s.source}</th>
            </tr>
          </thead>
          <tbody>
            {pack.poms.map((p) => (
              <tr key={p.code}>
                <td className="num font-bold text-brand-500">{p.code}</td>
                <td className="min-w-44 font-medium text-heading">
                  <Bi en={p.name_en} ar={p.name_ar} lang={lang} />
                </td>
                <td className="text-body">
                  <Bi en={p.how_to_measure_en} ar={p.how_to_measure_ar} lang={lang} />
                </td>
                {sizes.map((z) => (
                  <td key={z} className={`num ${z === base ? "bg-brand-100/30 font-semibold text-brand-700" : ""}`}>
                    {editing && z === base && onChange ? (
                      <input type="number" step="0.1" className="num w-20 py-1" value={draftValues?.[p.code] ?? p.values[z]} onChange={(e) => onChange(p.code, Number(e.target.value))} />
                    ) : (
                      p.values[z].toFixed(1)
                    )}
                  </td>
                ))}
                <td className="num">{p.tolerance_cm.toFixed(1)}</td>
                <td className="num text-[11px] text-muted max-w-56">{p.derivation}</td>
                <td>
                  <ProvBadge source={p.source} confidence={p.confidence} lang={lang} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function PiecesConsumptionSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  const c = pack.consumption;
  return (
    <Section id="pieces" print={print} title={s.sec_pieces}>
      {pack.pattern_pieces.length > 0 && (
        <div className="overflow-x-auto">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Pattern piece</th>
                <th className="num">Qty / shell</th>
                <th className="num">Qty total</th>
                <th>Cut dimensions ({pack.header.base_size})</th>
                <th>{s.notes}</th>
              </tr>
            </thead>
            <tbody>
              {pack.pattern_pieces.map((p, i) => (
                <tr key={i}>
                  <td className="font-medium text-heading">
                    <Bi en={p.name_en} ar={p.name_ar} lang={lang} />
                  </td>
                  <td className="num">{p.qty_per_shell}</td>
                  <td className="num">{p.qty_total}</td>
                  <td className="num text-[12px]">{p.cut_dimensions_base_en}</td>
                  <td className="text-[12px] text-body">{p.notes_en}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.2fr]">
        <div className="overflow-x-auto">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Colour</th>
                <th className="num">Net cm²</th>
                <th className="num">Gross cm²</th>
                <th className="num">m / unit</th>
                <th className="num">g / unit</th>
                {c.run_totals_m && <th className="num">Run total m</th>}
              </tr>
            </thead>
            <tbody>
              {c.per_unit.map((u, i) => (
                <tr key={u.colour}>
                  <td className="font-medium text-heading">{u.colour}</td>
                  <td className="num">{u.net_area_cm2}</td>
                  <td className="num">{u.gross_area_cm2}</td>
                  <td className="num font-semibold">{u.metres_per_unit.toFixed(2)}</td>
                  <td className="num">{u.grams_per_unit}</td>
                  {c.run_totals_m && <td className="num font-semibold">{c.run_totals_m[i]?.metres}</td>}
                </tr>
              ))}
              {c.per_unit.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Not computed for this product family
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="num mt-2 text-[11px] text-muted">
            width {c.fabric_width_cm} cm · usable {c.usable_width_cm} cm · marker efficiency {c.marker_efficiency} · shrinkage allowance {c.shrinkage_allowance_pct}%{c.run_quantity ? ` · run ${c.run_quantity} pcs` : ""}
          </p>
        </div>
        <ul className="panel list-disc space-y-1 p-4 ps-8 text-[12px] text-body">
          {c.formulas_en.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function BomSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  return (
    <Section id="bom" print={print} title={s.sec_bom}>
      <div className="overflow-x-auto">
        <table className="spec-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Item</th>
              <th className="min-w-56">Description</th>
              <th>Composition</th>
              <th className="num">gsm</th>
              <th className="num">Width</th>
              <th>Placement</th>
              <th className="num">Qty / unit</th>
              <th>Colour rule</th>
              <th>Supplier</th>
              <th>{s.source}</th>
            </tr>
          </thead>
          <tbody>
            {pack.bom.map((b) => (
              <tr key={b.ref}>
                <td className="num font-bold text-brand-500">{b.ref}</td>
                <td className="min-w-40 font-medium text-heading">
                  <Bi en={b.item_en} ar={b.item_ar} lang={lang} />
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{b.category}</div>
                </td>
                <td className="text-body">
                  {b.description_en}
                  {b.notes_en && <div className="mt-1 text-[11px] text-muted">{b.notes_en}</div>}
                </td>
                <td>{b.composition ?? "—"}</td>
                <td className="num">{b.weight_gsm ?? "—"}</td>
                <td className="num">{b.width_cm ? `${b.width_cm} cm` : "—"}</td>
                <td>
                  <Bi en={b.placement_en} ar={b.placement_ar} lang={lang} />
                </td>
                <td className="num">
                  {b.qty_per_unit} {b.unit}
                </td>
                <td className="text-[12px]">{b.colour_rule_en}</td>
                <td className="text-[12px]">{b.supplier}</td>
                <td>
                  <ProvBadge source={b.source} confidence={b.confidence} lang={lang} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function ConstructionSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  const st = pack.construction.standards;
  const rows: [string, string][] = [
    ["Stitch type", st.stitch_type],
    ["Seam type", st.seam_type],
    ["SPI seaming", st.spi_seam],
    ["SPI topstitch", st.spi_topstitch],
    ["Seam allowance", `${st.seam_allowance_cm} cm`],
    ["Topstitch", `${st.topstitch_rows} row(s) · ${st.topstitch_offset_cm} cm from edge`],
    ["Needle", st.needle],
    ["Thread (seaming)", st.thread_seaming],
    ["Thread (topstitch)", st.thread_topstitch],
    ["Interfacing", st.interfacing_en],
    ["Pressing", st.pressing_en],
  ];
  return (
    <Section id="construction" print={print} title={s.sec_construction} subtitle={pack.construction.sam_estimate_min ? `SAM estimate ${pack.construction.sam_estimate_min} min · ${pack.construction.sam_note_en}` : pack.construction.sam_note_en}>
      <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] md:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-bg-50 px-3 py-2">
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
            <dd className="text-heading">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <table className="spec-table">
          <thead>
            <tr>
              <th className="num">{s.step}</th>
              <th className="min-w-72">{s.operation}</th>
              <th>{s.machine}</th>
              <th>{s.stitch}</th>
              <th>{s.spi}</th>
              <th className="min-w-56">{s.notes}</th>
            </tr>
          </thead>
          <tbody>
            {pack.construction.operations.map((o) => (
              <tr key={o.step}>
                <td className="num font-bold text-brand-500">{o.step}</td>
                <td className="font-medium text-heading">
                  <Bi en={o.operation_en} ar={o.operation_ar} lang={lang} />
                </td>
                <td className="text-[12px]">{o.machine}</td>
                <td className="num text-[12px]">{o.stitch}</td>
                <td className="num text-[12px]">{o.spi}</td>
                <td className="text-[12px] text-body">
                  <Bi en={o.notes_en} ar={o.notes_ar || null} lang={lang} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pack.construction.special_notes_en.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 ps-6 text-[12.5px] text-body">
          {pack.construction.special_notes_en.map((n, i) => (
            <li key={i}>
              <Bi en={n} ar={pack.construction.special_notes_ar[i] ?? null} lang={lang} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function ColorwaysSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  return (
    <Section id="colorways" print={print} title={s.sec_colorways} subtitle={<Bi en={pack.colorway_note_en} ar={pack.colorway_note_ar} lang={lang} />}>
      <div className="grid gap-4 md:grid-cols-2">
        {pack.colorways.map((cw) => (
          <div key={cw.code} className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="num me-2 font-bold text-brand-500">{cw.code}</span>
                <span className="font-semibold text-heading">
                  <Bi en={cw.name_en} ar={cw.name_ar} lang={lang} inline />
                </span>
              </div>
            </div>
            <table className="spec-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Colour</th>
                  <th>Pantone TCX</th>
                  <th>Hex</th>
                  <th>BOM</th>
                </tr>
              </thead>
              <tbody>
                {cw.components.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <Bi en={c.component_en} ar={c.component_ar} lang={lang} />
                    </td>
                    <td>
                      <span className="swatch me-2" style={{ background: c.hex }} />
                      {c.colour_name}
                    </td>
                    <td className="num">{c.pantone_tcx}</td>
                    <td className="num">{c.hex}</td>
                    <td className="num">{c.bom_ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <dt className="text-muted">Needle thread</dt>
                <dd className="text-heading">{cw.thread_needle}</dd>
              </div>
              <div>
                <dt className="text-muted">Bobbin thread</dt>
                <dd className="text-heading">{cw.thread_bobbin}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Brand label side</dt>
                <dd className="text-heading">
                  <Bi en={cw.label_side_en} ar={cw.label_side_ar} lang={lang} inline />
                </dd>
              </div>
              {cw.notes_en && <div className="col-span-2 text-body">{cw.notes_en}</div>}
            </dl>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function LabelsPackagingSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  return (
    <Section id="labels" print={print} title={s.sec_labels}>
      <div className="overflow-x-auto">
        <table className="spec-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Placement</th>
              <th>Content</th>
              <th>{s.notes}</th>
            </tr>
          </thead>
          <tbody>
            {pack.labels.map((l, i) => (
              <tr key={i}>
                <td className="font-medium text-heading">{l.type}</td>
                <td>
                  <Bi en={l.placement_en} ar={l.placement_ar} lang={lang} />
                </td>
                <td>
                  <Bi en={l.content_en} ar={l.content_ar} lang={lang} />
                </td>
                <td className="text-[12px] text-body">{l.notes_en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 text-[12.5px]">
        <div className="panel p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Packing</h3>
          <Bi en={pack.packaging.method_en} ar={pack.packaging.method_ar} lang={lang} />
          <p className="mt-2 text-muted">{pack.packaging.carton_note_en}</p>
        </div>
        <ul className="panel list-disc p-4 ps-8">
          {pack.packaging.items_en.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function QcSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  return (
    <Section id="qc" print={print} title={s.sec_qc} subtitle={pack.qc.aql_en}>
      <div className="grid gap-4 md:grid-cols-2 text-[12.5px]">
        <ol className="list-decimal space-y-1 ps-6">
          {pack.qc.checks_en.map((c, i) => (
            <li key={i}>
              <Bi en={c} ar={pack.qc.checks_ar[i] ?? null} lang={lang} />
            </li>
          ))}
        </ol>
        <ul className="panel list-disc space-y-1 p-4 ps-8">
          {pack.qc.tests_en.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function AssumptionsSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  const tone = (i: string) => (i === "high" ? "badge-flash" : i === "medium" ? "badge-ready" : "badge-soft");
  return (
    <Section id="assumptions" print={print} title={s.sec_assumptions}>
      <div className="grid gap-5 md:grid-cols-2 text-[12.5px]">
        <ul className="space-y-2">
          {pack.assumptions.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className={`badge ${tone(a.impact)} h-5 flex-none`}>{a.impact}</span>
              <Bi en={a.text_en} ar={a.text_ar} lang={lang} />
            </li>
          ))}
        </ul>
        <ol className="panel list-decimal space-y-2 p-4 ps-8">
          {pack.questions_for_factory.map((q, i) => (
            <li key={i}>
              <Bi en={q.text_en} ar={q.text_ar} lang={lang} />
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

export function ReadinessSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  const r = pack.readiness;
  return (
    <Section id="readiness" print={print} title={s.sec_readiness}>
      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        <div className="panel flex flex-col items-center justify-center p-5">
          <div className={`num text-5xl font-extrabold ${r.score >= 85 ? "text-verified" : r.score >= 65 ? "text-link" : "text-price"}`}>{r.score}</div>
          <div className="text-xs text-muted">/ 100</div>
        </div>
        <ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">
          {r.checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white ${c.pass ? "bg-verified" : "bg-cta-hover"}`}>{c.pass ? "✓" : "✗"}</span>
              <span className="text-heading">
                {c.item_en}
                {c.note_en && <span className="text-muted"> · {c.note_en}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {pack.pipeline.validation.warnings.length > 0 && (
        <details className="mt-4 text-[12px] text-muted">
          <summary className="cursor-pointer">Validator warnings ({pack.pipeline.validation.warnings.length})</summary>
          <ul className="mt-1 list-disc ps-5">
            {pack.pipeline.validation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  );
}

export function RevisionsSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const s = t(lang);
  return (
    <Section id="revisions" print={print} title={s.sec_revisions}>
      <table className="spec-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Date</th>
            <th>Author</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {pack.revision_log.map((r, i) => (
            <tr key={i}>
              <td className="num">{r.version}</td>
              <td className="num">{r.date}</td>
              <td>{r.author}</td>
              <td>{r.change_en}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!print && (
        <div className="mt-4 text-[11px] text-muted">
          <span className="num">
            Generated by Masdr Tech Pack AI · pipeline {pack.meta.generator.pipeline_version} · {(pack.pipeline.total_ms / 1000).toFixed(0)} s
          </span>
          {pack.pipeline.critique && (
            <span>
              {" "}
              · factory review score {pack.pipeline.critique.factory_readiness_score} ({pack.pipeline.critique.verdict})
            </span>
          )}
        </div>
      )}
    </Section>
  );
}


export function AcknowledgementSection({ pack, lang, print }: { pack: TechPack; lang: Lang; print?: boolean }) {
  const rows: [string, string][] = [
    ["Sample size / مقاس العينة", pack.header.base_size],
    ["Units / الوحدات", "cm · gsm · Tex · SPI"],
    ["Tolerances accepted as listed / السماحات مقبولة كما هي", "☐ yes / نعم   ☐ no, see comments / لا، انظر الملاحظات"],
    ["Fabric lot residual shrinkage % / نسبة الانكماش المتبقية للدفعة", "____ % warp   ____ % weft"],
    ["Thread Tex / colours available / الخيوط المتاحة", "☐ Tex 30 seaming   ☐ Tex 40 topstitch   colours: ______"],
    ["Label supplier confirmed / مورد البطاقات مؤكد", "☐ brand label   ☐ care label   ☐ hangtag"],
    ["Sample lead time / مدة تجهيز العينة", "____ working days"],
    ["Bulk lead time from PP approval / مدة الإنتاج بعد اعتماد العينة", "____ working days"],
    ["Comments / ملاحظات", ""],
    ["Factory name, reviewer, date, signature / اسم المصنع، المراجع، التاريخ، التوقيع", ""],
  ];
  return (
    <Section id="acknowledgement" print={print} title={lang === "ar" ? "إقرار المصنع" : "Factory acknowledgement"} subtitle={lang === "ar" ? "يُملأ من غرفة العينات ويُعاد قبل القص" : "To be completed by the sample room and returned before cutting"}>
      <table className="spec-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="w-1/2 font-medium text-heading">{k}</td>
              <td className="h-9 text-body">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="num mt-3 text-[11px] text-muted">
        {pack.header.brand} · {pack.header.style_number} · v{pack.meta.version} · {pack.header.date}
      </p>
    </Section>
  );
}
