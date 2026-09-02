import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createJob, listJobs } from "@/lib/jobs/store";
import { enqueue } from "@/lib/jobs/queue";
import { runJob, newId } from "@/lib/pipeline/run";
import { uploadsDir } from "@/lib/storage";
import { hasApiKey } from "@/lib/ai/client";
import type { GenerationOptions } from "@/lib/ai/stages";

export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function autoStyleNumber() {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `MSDR-${yymm}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function GET() {
  return NextResponse.json({ jobs: listJobs(50).map((j) => ({ id: j.id, created_at: j.created_at, updated_at: j.updated_at, status: j.status, stage: j.stage, description: j.description, error: j.error, pack_id: j.pack_id })) });
}

export async function POST(req: NextRequest) {
  if (!hasApiKey()) return NextResponse.json({ error: "Server is missing ANTHROPIC_API_KEY" }, { status: 503 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  const ext = MIME_EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Image must be JPEG, PNG or WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image larger than 12 MB" }, { status: 400 });

  const description = String(form.get("description") ?? "").slice(0, 4000);
  const runQtyRaw = String(form.get("runQuantity") ?? "").trim();
  const runQuantity = runQtyRaw ? Math.max(1, Math.min(1_000_000, Number(runQtyRaw) || 0)) || null : null;
  const options: GenerationOptions = {
    brand: String(form.get("brand") ?? "").slice(0, 80).trim(),
    styleNumber: String(form.get("styleNumber") ?? "").slice(0, 40).trim() || autoStyleNumber(),
    season: String(form.get("season") ?? "").slice(0, 40).trim() || "First run",
    runQuantity,
    targetMarket: String(form.get("targetMarket") ?? "").slice(0, 80).trim() || "Egypt (domestic)",
  };

  const jobId = newId("job");
  const imagePath = path.join(uploadsDir(), `${jobId}.${ext}`);
  fs.writeFileSync(imagePath, Buffer.from(await file.arrayBuffer()));
  createJob({ id: jobId, description, image_path: imagePath, image_mime: file.type, options });
  enqueue(() => runJob(jobId));
  return NextResponse.json({ jobId }, { status: 202 });
}
