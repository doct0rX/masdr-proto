import { NextResponse } from "next/server";
import { MODELS, hasApiKey } from "@/lib/ai/client";
import { queueStats } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "masdr-techpack",
    models: MODELS,
    api_key_present: hasApiKey(),
    queue: queueStats(),
    time: new Date().toISOString(),
  });
}
