import { NextResponse, type NextRequest } from "next/server";
import { getJob } from "@/lib/jobs/store";
import { history } from "@/lib/jobs/events";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { options_json, ...rest } = job;
  delete (rest as Partial<typeof rest>).image_path;
  return NextResponse.json({ job: { ...rest, options: JSON.parse(options_json) }, events: history(id).filter((e) => e.type !== "text") });
}
