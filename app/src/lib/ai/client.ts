import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY ?? "claude-opus-5",
  fast: process.env.ANTHROPIC_MODEL_FAST ?? "claude-sonnet-5",
};

/** USD per million tokens. Source: Anthropic pricing table (2026-06). */
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  "claude-fable-5": { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!client) {
    // Identity-linked API keys must send the workspace they act in on every request.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    client = new Anthropic({
      timeout: 10 * 60 * 1000,
      maxRetries: 3,
      defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : undefined,
    });
  }
  return client;
}

export function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export interface UsageSummary {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
}

export function summarizeUsage(model: string, usage: Anthropic.Messages.Usage | undefined): UsageSummary {
  const p = PRICING[model] ?? PRICING["claude-opus-5"];
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const cacheRead = usage?.cache_read_input_tokens ?? 0;
  const cacheWrite = usage?.cache_creation_input_tokens ?? 0;
  const cost = (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite) / 1_000_000;
  return { input_tokens: input, output_tokens: output, cache_read_tokens: cacheRead, cache_write_tokens: cacheWrite, cost_usd: Math.round(cost * 10000) / 10000 };
}

export class RefusalError extends Error {
  constructor(public model: string, public category: string | null, explanation: string | null) {
    super(`Model ${model} declined the request${category ? ` (${category})` : ""}${explanation ? `: ${explanation}` : ""}`);
    this.name = "RefusalError";
  }
}

export class IncompleteOutputError extends Error {
  constructor(public model: string, public stopReason: string | null) {
    super(`Model ${model} stopped with ${stopReason}; output incomplete`);
    this.name = "IncompleteOutputError";
  }
}

export function assertCompleted(model: string, msg: Anthropic.Messages.Message) {
  if (msg.stop_reason === "refusal") {
    throw new RefusalError(model, msg.stop_details?.category ?? null, msg.stop_details?.explanation ?? null);
  }
  if (msg.stop_reason === "max_tokens") {
    throw new IncompleteOutputError(model, msg.stop_reason);
  }
}
