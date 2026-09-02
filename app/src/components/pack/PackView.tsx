"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TechPack } from "@/lib/techpack/schema";
import { t, type Lang } from "@/lib/i18n/strings";
import {
  CoverSection,
  ProductSection,
  FlatsSection,
  PomSection,
  PiecesConsumptionSection,
  BomSection,
  ConstructionSection,
  ColorwaysSection,
  LabelsPackagingSection,
  QcSection,
  AssumptionsSection,
  ReadinessSection,
  RevisionsSection,
  AcknowledgementSection,
} from "./Sections";

const MOCK_FACTORIES = [
  { name: "CA••••••••", city: "6th of October, Giza", moq: 200, badges: ["verified", "lowmoq"], note: "Headwear & caps · 12 lines" },
  { name: "NI••••••••", city: "10th of Ramadan City", moq: 300, badges: ["verified", "ready"], note: "Cut-make-trim · cotton twill in stock" },
  { name: "AL••••••••", city: "Sheikh Zayed, Cairo", moq: 150, badges: ["verified"], note: "Small-batch apparel · sampling in 7 days" },
];

export function PackView({ pack: initial, lang, imageUrl }: { pack: TechPack; lang: Lang; imageUrl: string | null }) {
  const s = t(lang);
  const router = useRouter();
  const [pack, setPack] = useState(initial);
  const [editingPoms, setEditingPoms] = useState(false);
  const [draftVals, setDraftVals] = useState<Record<string, number>>({});
  const [editingProduct, setEditingProduct] = useState(false);
  const [descEn, setDescEn] = useState(initial.product.description_en);
  const [descAr, setDescAr] = useState(initial.product.description_ar);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [factories, setFactories] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const patch = async (changes: Partial<TechPack>, note: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/packs/${pack.meta.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes, note, author: "Buyer" }) });
      const data = (await res.json()) as { pack?: TechPack; error?: string };
      if (!res.ok || !data.pack) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPack(data.pack);
      showToast(`Saved v${data.pack.meta.version}`);
      router.refresh();
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const savePoms = async () => {
    const base = pack.header.base_size;
    const poms = pack.poms.map((p) => (draftVals[p.code] !== undefined ? { ...p, values: { ...p.values, [base]: draftVals[p.code] } } : p));
    await patch({ poms }, `Edited base-size measurements (${Object.keys(draftVals).join(", ") || "none"}); other sizes regraded`);
    setEditingPoms(false);
    setDraftVals({});
  };

  const saveProduct = async () => {
    await patch({ product: { ...pack.product, description_en: descEn, description_ar: descAr } }, "Edited product description");
    setEditingProduct(false);
  };

  const exportAs = async (fmt: "pdf" | "xlsx" | "json", mode: "full" | "sample_room" = "full") => {
    setExporting(mode === "sample_room" ? "sample" : fmt);
    try {
      const res = await fetch(`/api/packs/${pack.meta.id}/export/${fmt}?lang=${mode === "sample_room" ? "ar" : lang}&mode=${mode}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error);
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `techpack.${fmt}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const nav = [
    ["cover", s.sec_cover],
    ["product", s.sec_product],
    ["flats", s.sec_flats],
    ["poms", s.sec_poms],
    ["pieces", s.sec_pieces],
    ["bom", s.sec_bom],
    ["construction", s.sec_construction],
    ["colorways", s.sec_colorways],
    ["labels", s.sec_labels],
    ["qc", s.sec_qc],
    ["assumptions", s.sec_assumptions],
    ["readiness", s.sec_readiness],
    ["acknowledgement", lang === "ar" ? "إقرار المصنع" : "Acknowledgement"],
    ["revisions", s.sec_revisions],
  ];

  return (
    <div className="page-cream"><div className="mx-auto max-w-7xl px-6 pb-10 pt-4">
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-bg-100 bg-cream/95 px-6 py-3 backdrop-blur no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1 text-xs">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full px-3 py-1.5 font-medium text-heading hover:bg-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" disabled={!!exporting} onClick={() => exportAs("pdf")}>
              {exporting === "pdf" ? "…" : "↓"} {s.export_pdf}
            </button>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => exportAs("xlsx")}>
              {exporting === "xlsx" ? "…" : "↓"} {s.export_xlsx}
            </button>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => exportAs("json")}>
              {exporting === "json" ? "…" : "↓"} {s.export_json}
            </button>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => exportAs("pdf", "sample_room")} title="Arabic-first sheet: flats, POM chart, cut sheet, operation sheet, acknowledgement">
              {exporting === "sample" ? "…" : "↓"} {lang === "ar" ? "ورقة غرفة العينات" : "Sample-room sheet (AR)"}
            </button>
            <button className="btn-cta" onClick={() => setFactories(true)}>
              {s.send_factories}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <CoverSection pack={pack} lang={lang} imageUrl={imageUrl} />
        <ProductSection
          pack={pack}
          lang={lang}
          actions={
            editingProduct ? (
              <>
                <button className="btn-secondary" onClick={() => setEditingProduct(false)}>
                  {s.cancel}
                </button>
                <button className="btn-primary !h-10" disabled={saving} onClick={saveProduct}>
                  {s.save}
                </button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => setEditingProduct(true)}>
                ✎ {s.edit}
              </button>
            )
          }
        />
        {editingProduct && (
          <div className="card -mt-4 grid gap-3 p-6 md:grid-cols-2">
            <textarea rows={5} value={descEn} onChange={(e) => setDescEn(e.target.value)} className="en" />
            <textarea rows={5} value={descAr} onChange={(e) => setDescAr(e.target.value)} className="ar" dir="rtl" />
          </div>
        )}
        <FlatsSection pack={pack} lang={lang} />
        <PomSection
          pack={pack}
          lang={lang}
          editing={editingPoms}
          draftValues={draftVals}
          onChange={(code, v) => setDraftVals((d) => ({ ...d, [code]: v }))}
          actions={
            editingPoms ? (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditingPoms(false);
                    setDraftVals({});
                  }}
                >
                  {s.cancel}
                </button>
                <button className="btn-primary !h-10" disabled={saving} onClick={savePoms}>
                  {saving ? "…" : s.save}
                </button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => setEditingPoms(true)} title="Edit the base size; other sizes regrade automatically">
                ✎ {s.edit} {pack.header.base_size}
              </button>
            )
          }
        />
        <PiecesConsumptionSection pack={pack} lang={lang} />
        <BomSection pack={pack} lang={lang} />
        <ConstructionSection pack={pack} lang={lang} />
        <ColorwaysSection pack={pack} lang={lang} />
        <LabelsPackagingSection pack={pack} lang={lang} />
        <QcSection pack={pack} lang={lang} />
        <AssumptionsSection pack={pack} lang={lang} />
        <ReadinessSection pack={pack} lang={lang} />
        <AcknowledgementSection pack={pack} lang={lang} />
        <RevisionsSection pack={pack} lang={lang} />
      </div>

      {factories && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6" onClick={() => setFactories(false)}>
          <div className="card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-heading">{s.send_factories}</h3>
            <p className="mt-1 text-sm text-muted">Matching Clothing factories on Masdr for this style. Names are revealed after you sign in.</p>
            <ul className="mt-4 grid gap-3">
              {MOCK_FACTORIES.map((f) => (
                <li key={f.name} className="panel flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="num font-semibold text-heading">{f.name}</span>
                      {f.badges.map((b) => (
                        <span key={b} className={`badge badge-${b}`}>
                          {b === "lowmoq" ? "Low MOQ" : b === "ready" ? "Ready to ship" : "Verified"}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted">
                      {f.city} · {f.note}
                    </div>
                  </div>
                  <div className="num text-xs font-semibold text-heading">MOQ {f.moq} pcs</div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setFactories(false)}>
                {s.cancel}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setFactories(false);
                  showToast("Quote request sent to 3 verified factories (prototype: mocked)");
                }}
              >
                Request quotes
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-heading px-5 py-3 text-sm text-white shadow-lg">{toast}</div>}
    </div></div>
  );
}
