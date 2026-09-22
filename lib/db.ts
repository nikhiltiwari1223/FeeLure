// FeeLure database layer (STAGE 2).
//
// Uses Node's built-in SQLite (node:sqlite) — no external dependency — with a
// database file at <project>/data/feelure.db so reports and vote metadata
// survive dev-server restarts and are shared by every visitor of the deployed
// app.
//
// Deployment note: a file-backed SQLite database persists on VM-style hosts
// (Fly.io, Railway, Render, any VPS). On ephemeral serverless platforms the
// file would not survive — that is a Stage 5 deployment decision (swap in a
// hosted database; lib/reports.ts keeps the same interface).

import { mkdirSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

/**
 * Where the SQLite database + uploaded screenshots live.
 * On hosts with a mounted persistent volume (e.g. Railway), set
 * FEELURE_DATA_DIR to the mount path; defaults to <project>/data locally.
 */
export const DATA_DIR = process.env.FEELURE_DATA_DIR
  ? path.resolve(process.env.FEELURE_DATA_DIR)
  : path.join(process.cwd(), "data");

let dbInstance: DatabaseSync | null = null;

/** Thrown when the database cannot be opened or queried. */
export class StorageUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The report database is temporarily unavailable.");
    this.name = "StorageUnavailableError";
    this.cause = cause;
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  try {
    mkdirSync(DATA_DIR, { recursive: true });

    const db = new DatabaseSync(path.join(DATA_DIR, "feelure.db"));

    // WAL mode: safe concurrent reads while a write happens.
    db.exec("PRAGMA journal_mode = WAL;");

    db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id              TEXT PRIMARY KEY,
        title           TEXT    NOT NULL,
        url             TEXT    NOT NULL,
        domain          TEXT    NOT NULL,
        category        TEXT    NOT NULL,
        description     TEXT    NOT NULL,
        image_file      TEXT,
        screenshot_name TEXT,
        ai_analysis     TEXT,
        vote_count      INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_category   ON reports (category);

      CREATE TABLE IF NOT EXISTS vote_cooldowns (
        cooldown_key TEXT PRIMARY KEY,
        last_vote_at INTEGER NOT NULL
      );
    `);

    dbInstance = db;
    return dbInstance;
  } catch (cause) {
    throw new StorageUnavailableError(cause);
  }
}

/** True when the storage layer is reachable (used for friendly UI errors). */
export function isStorageAvailable(): boolean {
  try {
    getDb().prepare("SELECT 1 AS ok").get();
    return true;
  } catch {
    return false;
  }
}
