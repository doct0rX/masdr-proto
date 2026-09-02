import { NextResponse, type NextRequest } from "next/server";
import { getPack } from "@/lib/jobs/store";
import { buildPackXlsx } from "@/lib/export/xlsx";
import { exportFileName } from "@/lib/export/filename";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/packs/[id]/export/[format]">) {
  const { id, format } = await ctx.params;
  const pack = getPack(id);
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lang = req.nextUrl.searchParams.get("lang") === "ar" ? "ar" : "en";
  const mode = req.nextUrl.searchParams.get("mode") === "sample_room" ? "sample_room" : "full";
  const name = exportFileName(pack, mode === "sample_room" ? `SAMPLEROOM.${format}` : format);
  const disposition = `attachment; filename="${name}"`;
  try {
    if (format === "json") {
      return new Response(JSON.stringify(pack, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": disposition } });
    }
    if (format === "xlsx") {
      const buf = await buildPackXlsx(pack, lang);
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": disposition } });
    }
    if (format === "pdf") {
      // Loaded lazily so JSON/XLSX exports never depend on the Chromium renderer being present.
      const { renderPackPdf } = await import("@/lib/export/pdf");
      const buf = await renderPackPdf(pack.meta.id, lang, mode);
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disposition } });
    }
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: `Export failed: ${(err as Error).message}` }, { status: 500 });
  }
}
