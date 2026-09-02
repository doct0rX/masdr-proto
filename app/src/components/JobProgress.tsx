"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n/strings";
import type { JobEvent } from "@/lib/jobs/events";

const STAGES = ["normalize", "vision", "route", "draft", "reconcile", "assemble+validate", "critique", "repair-1", "repair-2", "complete"] as const;

type StageState = "idle" | "running" | "done" | "error";

export function JobProgress({ jobId, lang, description, initialStatus, packId, initialError }: { jobId: string; lang: Lang; description: string; initialStatus: string; packId: string | null; initialError: string | null }) {
  const s = t(lang);
  const router = useRouter();
  const [states, setStates] = useState<Record<string, StageState>>(() => (initialStatus === "complete" ? Object.fromEntries(STAGES.filter((st) => !st.startsWith("repair")).map((st) => [st, "done" as StageState])) : {}));
  const [meta, setMeta] = useState<Record<string, { ms?: number }>>({});
  const [message, setMessage] = useState<string>("");
  const [percent, setPercent] = useState(initialStatus === "complete" ? 100 : 2);
  const [error, setError] = useState<string | null>(initialStatus === "failed" ? (initialError ?? "Failed") : null);
  const [done, setDone] = useState<string | null>(initialStatus === "complete" ? packId : null);
  const [live, setLive] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (done || error) return;
    const es = new EventSource(`/api/jobs/${jobId}/events`);
    es.onmessage = (m) => {
      const ev = JSON.parse(m.data) as JobEvent;
      if (ev.type === "stage") {
        setStates((st) => ({ ...st, [ev.stage]: ev.status === "start" ? "running" : ev.status === "done" ? "done" : "error" }));
        if (ev.status === "done") setMeta((mt) => ({ ...mt, [ev.stage]: { ms: ev.ms } }));
        if (ev.message) setMessage(ev.message);
        const idx = STAGES.indexOf(ev.stage as (typeof STAGES)[number]);
        if (idx >= 0) setPercent((p) => Math.max(p, Math.round(((idx + (ev.status === "done" ? 1 : 0.5)) / STAGES.length) * 95)));
      } else if (ev.type === "progress") {
        setPercent((p) => Math.max(p, ev.percent));
        setMessage(ev.message);
      } else if (ev.type === "text") {
        setLive(ev.delta);
      } else if (ev.type === "complete") {
        setPercent(100);
        setDone(ev.packId);
        es.close();
        setTimeout(() => router.push(`/packs/${ev.packId}`), 900);
      } else if (ev.type === "failed") {
        setError(ev.error);
        es.close();
      }
    };
    es.onerror = () => {
      /* EventSource auto-reconnects; the server replays history */
    };
    return () => es.close();
  }, [jobId, done, error, router]);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setRetrying(false);
    }
  };

  const label = (st: string) =>
    ({
      normalize: s.stage_normalize,
      vision: s.stage_vision,
      route: s.stage_route,
      draft: s.stage_draft,
      reconcile: s.stage_reconcile,
      "assemble+validate": s.stage_assemble,
      critique: s.stage_critique,
      "repair-1": `${s.stage_repair} 1`,
      "repair-2": `${s.stage_repair} 2`,
      complete: s.stage_complete,
    })[st] ?? st;

  return (
    <div className="card p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-heading">{done ? s.stage_complete : error ? s.failed : `${s.generating}…`}</h1>
          <p className="mt-1 text-sm text-muted line-clamp-2">{description}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/uploads/${jobId}`} alt="" className="h-20 w-28 rounded-xl object-cover border border-bg-100" />
      </div>

      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-bg-100">
        <div className={`h-full rounded-full transition-all duration-500 ${error ? "bg-cta-hover" : "bg-brand-500"}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 min-h-5 text-sm text-body">{error ? "" : message || live}</p>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {STAGES.filter((st) => !st.startsWith("repair") || states[st]).map((st) => {
          const state = states[st] ?? (done && st === "complete" ? "done" : "idle");
          return (
            <li key={st} className="flex items-center gap-3 rounded-2xl border border-bg-100 bg-white px-4 py-3">
              <span className={`stage-dot ${state}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-heading">{label(st)}</div>
                {meta[st]?.ms !== undefined && <div className="num text-[11px] text-muted">{(meta[st].ms! / 1000).toFixed(1)} s</div>}
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-price">
          <strong>{s.failed}:</strong> {error}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary !h-10" disabled={retrying} onClick={retry}>
              {retrying ? "…" : s.run_again}
            </button>
            <Link href="/" className="btn-secondary">
              {s.nav_new}
            </Link>
          </div>
        </div>
      )}

      {done && (
        <div className="mt-6 flex justify-end">
          <Link href={`/packs/${done}`} className="btn-primary">
            {s.view_pack}
          </Link>
        </div>
      )}
    </div>
  );
}
