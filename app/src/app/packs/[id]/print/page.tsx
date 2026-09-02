import { notFound } from "next/navigation";
import { getPack, getPackRow } from "@/lib/jobs/store";
import type { Lang } from "@/lib/i18n/strings";
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
} from "@/components/pack/Sections";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params, searchParams }: PageProps<"/packs/[id]/print">) {
  const { id } = await params;
  const sp = await searchParams;
  const lang: Lang = sp.lang === "ar" ? "ar" : "en";
  const pack = getPack(id);
  const row = getPackRow(id);
  if (!pack || !row) notFound();
  const mode = sp.mode === "sample_room" ? "sample_room" : "full";
  const common = { pack, lang, print: true } as const;
  if (mode === "sample_room") {
    return (
      <div className={`print-doc mx-auto max-w-[277mm] px-2 ${lang === "ar" ? "ar" : "en"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <CoverSection {...common} imageUrl={`/api/uploads/${row.job_id}`} />
        <FlatsSection {...common} />
        <PomSection {...common} />
        <PiecesConsumptionSection {...common} />
        <ConstructionSection {...common} />
        <AcknowledgementSection {...common} />
      </div>
    );
  }
  return (
    <div className={`print-doc mx-auto max-w-[277mm] px-2 ${lang === "ar" ? "ar" : "en"}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <CoverSection {...common} imageUrl={`/api/uploads/${row.job_id}`} />
      <ProductSection {...common} />
      <FlatsSection {...common} />
      <PomSection {...common} />
      <PiecesConsumptionSection {...common} />
      <BomSection {...common} />
      <ConstructionSection {...common} />
      <ColorwaysSection {...common} />
      <LabelsPackagingSection {...common} />
      <QcSection {...common} />
      <AssumptionsSection {...common} />
      <ReadinessSection {...common} />
      <AcknowledgementSection {...common} />
      <RevisionsSection {...common} />
    </div>
  );
}
