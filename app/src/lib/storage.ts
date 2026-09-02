import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
}

export function uploadsDir(): string {
  const d = path.join(dataDir(), "uploads");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function exportsDir(): string {
  const d = path.join(dataDir(), "exports");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) throw new Error("Invalid id");
  return id;
}
