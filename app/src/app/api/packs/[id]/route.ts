import { NextResponse, type NextRequest } from "next/server";
import { getPack, getPackRow, savePack } from "@/lib/jobs/store";
import { TechPack } from "@/lib/techpack/schema";
import { applyPackEdit } from "@/lib/techpack/edit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/packs/[id]">) {
  const { id } = await ctx.params;
  const pack = getPack(id);
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ pack });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/packs/[id]">) {
  const { id } = await ctx.params;
  const row = getPackRow(id);
  const pack = getPack(id);
  if (!pack || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { changes?: Partial<TechPack>; note?: string; author?: string } | null;
  if (!body?.changes) return NextResponse.json({ error: "Body must include changes" }, { status: 400 });
  try {
    const updated = applyPackEdit(pack, body.changes, body.note ?? "Manual edit", body.author ?? "Buyer");
    savePack(updated, row.job_id);
    return NextResponse.json({ pack: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
