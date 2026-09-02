import fs from "node:fs";
import type { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/uploads/[id]">) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job || !fs.existsSync(job.image_path)) return new Response("Not found", { status: 404 });
  const buf = fs.readFileSync(job.image_path);
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": job.image_mime, "Cache-Control": "private, max-age=3600" } });
}
