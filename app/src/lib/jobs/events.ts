export type JobEvent =
  | { type: "stage"; stage: string; status: "start" | "done" | "error"; message?: string; ms?: number }
  | { type: "text"; stage: string; delta: string }
  | { type: "progress"; percent: number; message: string }
  | { type: "complete"; packId: string }
  | { type: "failed"; error: string };

type Listener = (ev: JobEvent) => void;

interface Bus {
  listeners: Map<string, Set<Listener>>;
  history: Map<string, JobEvent[]>;
}

const g = globalThis as unknown as { __masdrBus?: Bus };
const bus: Bus = g.__masdrBus ?? (g.__masdrBus = { listeners: new Map(), history: new Map() });

const MAX_HISTORY = 400;

export function emit(jobId: string, ev: JobEvent) {
  const h = bus.history.get(jobId) ?? [];
  // Text deltas are noisy; keep only the tail so late subscribers get context.
  h.push(ev);
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  bus.history.set(jobId, h);
  for (const l of bus.listeners.get(jobId) ?? []) {
    try {
      l(ev);
    } catch {
      /* listener errors must not break the pipeline */
    }
  }
}

export function subscribe(jobId: string, l: Listener): () => void {
  let set = bus.listeners.get(jobId);
  if (!set) {
    set = new Set();
    bus.listeners.set(jobId, set);
  }
  set.add(l);
  return () => {
    set!.delete(l);
    if (set!.size === 0) bus.listeners.delete(jobId);
  };
}

export function history(jobId: string): JobEvent[] {
  return bus.history.get(jobId) ?? [];
}

export function clearHistory(jobId: string) {
  bus.history.delete(jobId);
}
