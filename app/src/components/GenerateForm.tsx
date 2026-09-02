"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n/strings";

const EXAMPLE_DESCRIPTION =
  "Plain cotton twill bucket hat (~280 gsm), reversible, two colorways: khaki outer / black reverse and black outer / khaki reverse. Sizes S/M/L. Single-row brim topstitch. First production run for a small Egyptian apparel brand.";

export function GenerateForm({ lang }: { lang: Lang }) {
  const s = t(lang);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [styleNumber, setStyleNumber] = useState("");
  const [season, setSeason] = useState("SS27");
  const [runQuantity, setRunQuantity] = useState("300");
  const [targetMarket, setTargetMarket] = useState("Egypt (domestic)");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File | null) => {
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }, []);

  const useExample = async () => {
    setError(null);
    const res = await fetch("/examples/masdr_bucket_hat.png");
    const blob = await res.blob();
    pick(new File([blob], "masdr_bucket_hat.png", { type: "image/png" }));
    setDescription(EXAMPLE_DESCRIPTION);
    if (!brand) setBrand("Nile Thread Co.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(lang === "ar" ? "الصورة مطلوبة" : "Please add a product photo or sketch");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("description", description);
    fd.append("brand", brand);
    fd.append("styleNumber", styleNumber);
    fd.append("season", season);
    fd.append("runQuantity", runQuantity);
    fd.append("targetMarket", targetMarket);
    try {
      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6 md:p-8 grid gap-6 md:grid-cols-[1.1fr_1fr]">
      <div>
        <label className="block text-sm font-semibold text-heading mb-2">{s.form_image}</label>
        <div
          className={`dropzone ${drag ? "active" : ""} flex min-h-64 cursor-pointer flex-col items-center justify-center p-6 text-center`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pick(f);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-h-72 rounded-xl object-contain" />
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></div>
              <p className="text-sm font-medium text-heading">{s.form_image}</p>
              <p className="mt-1 text-xs text-muted">{s.form_image_hint}</p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
        <button type="button" onClick={useExample} className="btn-secondary mt-3">
          {s.form_example}
        </button>
      </div>

      <div className="grid gap-4 content-start">
        <div>
          <label className="block text-sm font-semibold text-heading mb-2">{s.form_description}</label>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={s.form_description_ph} maxLength={4000} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">{s.form_brand}</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">{s.form_style}</label>
            <input type="text" value={styleNumber} onChange={(e) => setStyleNumber(e.target.value)} placeholder={s.form_style_ph} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">{s.form_season}</label>
            <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">{s.form_qty}</label>
            <input type="number" min={1} value={runQuantity} onChange={(e) => setRunQuantity(e.target.value)} className="num" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-heading mb-1">{s.form_market}</label>
            <select value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>
              <option>Egypt (domestic)</option>
              <option>Egypt + GCC</option>
              <option>EU export</option>
              <option>US export</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-price">{error}</p>}
        <div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? `${s.generating}…` : s.form_submit}
          </button>
        </div>
      </div>
    </form>
  );
}
