import Link from "next/link";
import { listPacks, listJobs } from "@/lib/jobs/store";
import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

export default async function PacksPage() {
  const lang = await getLang();
  const s = t(lang);
  const packs = listPacks(50);
  const jobs = listJobs(50).filter((j) => j.status !== "complete");
  return (
    <div className="page-cream min-h-[70vh]"><div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-heading">{s.nav_packs}</h1>
      {jobs.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-semibold text-muted">In progress / failed</h2>
          <ul className="mt-2 divide-y divide-bg-100 text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2">
                <Link href={`/jobs/${j.id}`} className="text-brand-600 hover:underline line-clamp-1">
                  {j.description || j.id}
                </Link>
                <span className={`badge ${j.status === "failed" ? "badge-flash" : "badge-ready"}`}>{j.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mt-6 grid gap-3">
        {packs.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-4 p-5">
            <div>
              <Link href={`/packs/${p.id}`} className="font-semibold text-heading hover:text-brand-600">
                {p.style_name}
              </Link>
              <div className="num text-xs text-muted">
                {p.style_number} · v{p.version} · {new Date(p.updated_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
              </div>
            </div>
            <Link href={`/packs/${p.id}`} className="btn-secondary">
              {s.view_pack}
            </Link>
          </li>
        ))}
        {packs.length === 0 && (
          <li className="card p-8 text-center text-sm text-muted">
            <Link href="/" className="btn-primary">
              {s.nav_new}
            </Link>
          </li>
        )}
      </ul>
    </div></div>
  );
}
