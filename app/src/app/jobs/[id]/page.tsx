import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs/store";
import { getLang } from "@/lib/i18n/server";
import { JobProgress } from "@/components/JobProgress";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) notFound();
  const lang = await getLang();
  return (
    <div className="page-cream min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <JobProgress jobId={id} lang={lang} description={job.description} initialStatus={job.status} packId={job.pack_id} initialError={job.error} />
      </div>
    </div>
  );
}
