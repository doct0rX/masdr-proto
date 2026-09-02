import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getJob, createJob } from "@/lib/jobs/store";
import { enqueue } from "@/lib/jobs/queue";
import { runJob, newId } from "@/lib/pipeline/run";
import { uploadsDir } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Re-runs a failed job with the same upload, description and options as a new job. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/retry">) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!fs.existsSync(job.image_path)) return NextResponse.json({ error: "The uploaded image is no longer available; please upload it again" }, { status: 410 });
  const newJobId = newId("job");
  const ext = path.extname(job.image_path) || ".jpg";
  const imagePath = path.join(uploadsDir(), `${newJobId}${ext}`);
  fs.copyFileSync(job.image_path, imagePath);
  createJob({ id: newJobId, description: job.description, image_path: imagePath, image_mime: job.image_mime, options: JSON.parse(job.options_json) });
  enqueue(() => runJob(newJobId));
  return NextResponse.json({ jobId: newJobId }, { status: 202 });
}
