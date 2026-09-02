import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";
import { AccessForm } from "@/components/AccessForm";

export default async function AccessPage({ searchParams }: PageProps<"/access">) {
  const lang = await getLang();
  const s = t(lang);
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  return (
    <div className="page-cream min-h-[70vh]"><div className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8">
        <h1 className="font-display text-2xl font-bold text-heading">{s.access_title}</h1>
        <p className="mt-1 text-sm text-muted">{s.access_sub}</p>
        <AccessForm next={next} submitLabel={s.access_submit} />
      </div>
    </div></div>
  );
}
