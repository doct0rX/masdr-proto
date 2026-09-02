/**
 * Minimal in-process job queue with bounded concurrency. Survives Next.js HMR
 * via a globalThis singleton. For a single-instance prototype this is enough;
 * a multi-instance deployment would swap in SQS or a DB-backed queue.
 */

type Task = () => Promise<void>;

interface Q {
  running: number;
  pending: Task[];
  limit: number;
}

const g = globalThis as unknown as { __masdrQueue?: Q };
const q: Q = g.__masdrQueue ?? (g.__masdrQueue = { running: 0, pending: [], limit: Number(process.env.JOB_CONCURRENCY ?? 3) });

function pump() {
  while (q.running < q.limit && q.pending.length > 0) {
    const t = q.pending.shift()!;
    q.running++;
    t()
      .catch(() => {})
      .finally(() => {
        q.running--;
        pump();
      });
  }
}

export function enqueue(task: Task) {
  q.pending.push(task);
  pump();
}

export function queueStats() {
  return { running: q.running, pending: q.pending.length, limit: q.limit };
}
