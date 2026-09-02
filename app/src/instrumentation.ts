/**
 * Runs once when the server process starts. Jobs that were mid-generation when
 * the previous process stopped are re-queued once instead of being left as
 * failed, so a restart during a demo does not require the user to resubmit.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { requeueInterrupted } = await import("@/lib/jobs/store");
  const { enqueue } = await import("@/lib/jobs/queue");
  const { runJob } = await import("@/lib/pipeline/run");
  const ids = requeueInterrupted();
  for (const id of ids) enqueue(() => runJob(id));
  if (ids.length) console.log(`[masdr] re-queued ${ids.length} interrupted job(s): ${ids.join(", ")}`);
}
