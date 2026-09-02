import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/storage";
import type { TechPack } from "@/lib/techpack/schema";

export type JobStatus = "queued" | "running" | "complete" | "failed";

export interface JobRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: JobStatus;
  stage: string | null;
  description: string;
  image_path: string;
  image_mime: string;
  options_json: string;
  error: string | null;
  pack_id: string | null;
  retries: number;
}

export interface PackRow {
  id: string;
  job_id: string;
  created_at: string;
  updated_at: string;
  version: string;
  json: string;
}

const g = globalThis as unknown as { __masdrDb?: DatabaseSync };

function db(): DatabaseSync {
  if (g.__masdrDb) return g.__masdrDb;
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const d = new DatabaseSync(path.join(dir, "masdr.sqlite"));
  d.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      stage TEXT,
      description TEXT NOT NULL,
      image_path TEXT NOT NULL,
      image_mime TEXT NOT NULL,
      options_json TEXT NOT NULL,
      error TEXT,
      pack_id TEXT
    );
    CREATE TABLE IF NOT EXISTS packs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version TEXT NOT NULL,
      json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS packs_job ON packs(job_id);
    CREATE TABLE IF NOT EXISTS pack_versions (
      pack_id TEXT NOT NULL,
      version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (pack_id, version)
    );
  `);
  try {
    d.exec(`ALTER TABLE jobs ADD COLUMN retries INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column already exists */
  }
  g.__masdrDb = d;
  return d;
}

/**
 * Called once at process start: jobs interrupted by a restart are re-queued
 * once; a job interrupted twice is marked failed with a clear message.
 */
export function requeueInterrupted(): string[] {
  const t = now();
  const rows = db().prepare(`SELECT id, retries FROM jobs WHERE status IN ('running', 'queued')`).all() as unknown as { id: string; retries: number }[];
  const requeued: string[] = [];
  for (const r of rows) {
    if (r.retries < 1) {
      db().prepare(`UPDATE jobs SET status = 'queued', stage = NULL, retries = retries + 1, updated_at = ? WHERE id = ?`).run(t, r.id);
      requeued.push(r.id);
    } else {
      db().prepare(`UPDATE jobs SET status = 'failed', error = 'Generation was interrupted twice by a server restart. Use "Run again" to start over.', updated_at = ? WHERE id = ?`).run(t, r.id);
    }
  }
  return requeued;
}

const now = () => new Date().toISOString();

export function createJob(j: { id: string; description: string; image_path: string; image_mime: string; options: unknown }): JobRow {
  const t = now();
  db()
    .prepare(`INSERT INTO jobs (id, created_at, updated_at, status, stage, description, image_path, image_mime, options_json, error, pack_id) VALUES (?, ?, ?, 'queued', NULL, ?, ?, ?, ?, NULL, NULL)`)
    .run(j.id, t, t, j.description, j.image_path, j.image_mime, JSON.stringify(j.options));
  return getJob(j.id)!;
}

export function getJob(id: string): JobRow | null {
  const row = db().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as unknown as JobRow | undefined;
  return row ?? null;
}

export function updateJob(id: string, patch: Partial<Pick<JobRow, "status" | "stage" | "error" | "pack_id">>) {
  const sets: string[] = ["updated_at = ?"];
  const vals: (string | null)[] = [now()];
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = ?`);
    vals.push(v as string | null);
  }
  vals.push(id);
  db().prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function listJobs(limit = 50): JobRow[] {
  return db().prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`).all(limit) as unknown as JobRow[];
}

export function savePack(pack: TechPack, jobId: string) {
  const t = now();
  db()
    .prepare(`INSERT INTO packs (id, job_id, created_at, updated_at, version, json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, version = excluded.version, json = excluded.json`)
    .run(pack.meta.id, jobId, t, t, pack.meta.version, JSON.stringify(pack));
  db()
    .prepare(`INSERT OR REPLACE INTO pack_versions (pack_id, version, created_at, json) VALUES (?, ?, ?, ?)`)
    .run(pack.meta.id, pack.meta.version, t, JSON.stringify(pack));
}

export function listPackVersions(packId: string): { version: string; created_at: string }[] {
  return db().prepare(`SELECT version, created_at FROM pack_versions WHERE pack_id = ? ORDER BY created_at`).all(packId) as unknown as { version: string; created_at: string }[];
}

export function getPackVersion(packId: string, version: string): TechPack | null {
  const row = db().prepare(`SELECT json FROM pack_versions WHERE pack_id = ? AND version = ?`).get(packId, version) as unknown as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as TechPack) : null;
}

export function getPack(id: string): TechPack | null {
  const row = db().prepare(`SELECT json FROM packs WHERE id = ?`).get(id) as unknown as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as TechPack) : null;
}

export function getPackRow(id: string): PackRow | null {
  const row = db().prepare(`SELECT * FROM packs WHERE id = ?`).get(id) as unknown as PackRow | undefined;
  return row ?? null;
}

export function listPacks(limit = 50): { id: string; job_id: string; updated_at: string; version: string; style_name: string; style_number: string }[] {
  const rows = db().prepare(`SELECT id, job_id, updated_at, version, json FROM packs ORDER BY updated_at DESC LIMIT ?`).all(limit) as unknown as PackRow[];
  return rows.map((r) => {
    const p = JSON.parse(r.json) as TechPack;
    return { id: r.id, job_id: r.job_id, updated_at: r.updated_at, version: r.version, style_name: p.header.style_name_en, style_number: p.header.style_number };
  });
}
