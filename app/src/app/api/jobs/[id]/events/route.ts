import type { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs/store";
import { history, subscribe, type JobEvent } from "@/lib/jobs/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/events">) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return new Response("Not found", { status: 404 });
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const send = (ev: JobEvent) => {
        if (closed) return;
        controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };
      const hb = setInterval(() => {
        if (!closed) controller.enqueue(enc.encode(": ping\n\n"));
      }, 15000);
      const unsub = subscribe(id, (ev) => {
        send(ev);
        if (ev.type === "complete" || ev.type === "failed") close();
      });

      for (const ev of history(id)) send(ev);
      if (job.status === "complete" && job.pack_id) {
        send({ type: "complete", packId: job.pack_id });
        close();
      } else if (job.status === "failed") {
        send({ type: "failed", error: job.error ?? "Failed" });
        close();
      }
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
