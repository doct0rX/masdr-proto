import { notFound } from "next/navigation";
import { getPack, getPackRow } from "@/lib/jobs/store";
import { getLang } from "@/lib/i18n/server";
import { PackView } from "@/components/pack/PackView";

export const dynamic = "force-dynamic";

export default async function PackPage({ params }: PageProps<"/packs/[id]">) {
  const { id } = await params;
  const pack = getPack(id);
  const row = getPackRow(id);
  if (!pack || !row) notFound();
  const lang = await getLang();
  return <PackView pack={pack} lang={lang} imageUrl={`/api/uploads/${row.job_id}`} />;
}
