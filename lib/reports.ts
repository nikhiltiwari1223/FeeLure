// FeeLure data layer - STAGE 2 (SQLite via node:sqlite).
//
// Reports, screenshots metadata, and vote cooldowns are persisted in
// <project>/data/feelure.db (see lib/db.ts). Exported function signatures are
// unchanged from Stage 1, so the API routes and UI needed no redesign.

import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import path from "path";
import { getDb, StorageUnavailableError } from "./db";
import {
  isCategory,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
  type Category,
  type SortKey,
} from "./format";

export interface Report {
  id: string;
  title: string;
  url: string;
  domain: string;
  category: Category;
  description: string;
  /** Public URL of the stored screenshot (served by our own image route). */
  imageUrl: string | null;
  /** Internal file name inside public/uploads (never exposed to clients). */
  imageFile: string | null;
  /** Original file name chosen by the reporter, for display only. */
  screenshotName: string | null;
  /** AI-assisted screenshot findings after user review - Stage 4. */
  aiAnalysis: string | null;
  voteCount: number;
  createdAt: string;
}

export interface ReportInput {
  title: string;
  url: string;
  category: string;
  description: string;
}

export type CreateResult =
  | { ok: true; report: Report }
  | { ok: false; errors: Record<string, string> };

export function validateReportInput(
  input: Partial<ReportInput>
): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = (input.title ?? "").trim();
  if (!title) {
    errors.title = "A report title is required.";
  } else if (title.length < MIN_TITLE_LENGTH) {
    errors.title = `Title must be at least ${MIN_TITLE_LENGTH} characters.`;
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  const url = (input.url ?? "").trim();
  if (!url) {
    errors.url = "A website URL is required.";
  } else if (!/^https?:\/\//i.test(url)) {
    errors.url = "The URL must start with http:// or https://.";
  } else if (!isValidReportUrlSafe(url)) {
    errors.url = "That does not look like a valid website URL.";
  }

  if (!input.category) {
    errors.category = "Choose the suspected dark-pattern category.";
  } else if (!isCategory(input.category)) {
    errors.category = "That category is not recognised.";
  }

  const description = (input.description ?? "").trim();
  if (!description) {
    errors.description = "Please describe what you experienced.";
  } else if (description.length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`;
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  return errors;
}

function isValidReportUrlSafe(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return host.includes(".") && !host.endsWith(".") && !host.includes("..");
  } catch {
    return false;
  }
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url;
  }
}

/** Database row -> public Report shape. */
function rowToReport(row: Record<string, unknown>): Report {
  return {
    id: String(row.id),
    title: String(row.title),
    url: String(row.url),
    domain: String(row.domain),
    category: row.category as Category,
    description: String(row.description),
    imageUrl: row.image_file ? `/api/reports/${String(row.id)}/image` : null,
    imageFile: (row.image_file as string | null) ?? null,
    screenshotName: (row.screenshot_name as string | null) ?? null,
    aiAnalysis: (row.ai_analysis as string | null) ?? null,
    voteCount: Number(row.vote_count),
    createdAt: String(row.created_at),
  };
}

const REPORT_COLUMNS = `id, title, url, domain, category, description,
  image_file, screenshot_name, ai_analysis, vote_count, created_at`;

export function createReport(input: ReportInput): CreateResult {
  const errors = validateReportInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const report: Report = {
    id: randomUUID(),
    title: input.title.trim(),
    url: input.url.trim(),
    domain: domainOf(input.url.trim()),
    category: input.category as Category,
    description: input.description.trim(),
    imageUrl: null,
    imageFile: null,
    screenshotName: null,
    aiAnalysis: null,
    voteCount: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    getDb()
      .prepare(
        `INSERT INTO reports (${REPORT_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        report.id,
        report.title,
        report.url,
        report.domain,
        report.category,
        report.description,
        report.imageFile,
        report.screenshotName,
        report.aiAnalysis,
        report.voteCount,
        report.createdAt
      );
    return { ok: true, report };
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}

export function getReport(id: string): Report | undefined {
  try {
    const row = getDb()
      .prepare(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ?`)
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToReport(row) : undefined;
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}

export function setReportImage(
  id: string,
  imageFile: string,
  screenshotName: string
): Report | undefined {
  try {
    const result = getDb()
      .prepare(
        `UPDATE reports SET image_file = ?, screenshot_name = ? WHERE id = ?`
      )
      .run(imageFile, screenshotName, id);
    if (Number(result.changes) === 0) return undefined;
    return getReport(id);
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}

export function deleteReport(id: string): boolean {
  try {
    const result = getDb()
      .prepare(`DELETE FROM reports WHERE id = ?`)
      .run(id);
    return Number(result.changes) > 0;
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}

/** Removes a report's screenshot file from disk (best effort). */
export async function deleteReportImage(id: string): Promise<void> {
  const report = getReport(id);
  if (!report?.imageFile) return;
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", report.imageFile));
  } catch {
    // file already gone — fine
  }
}

export interface ListOptions {
  q?: string;
  category?: string;
  sort?: SortKey;
}

export function listReports(options: ListOptions = {}): Report[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  const q = (options.q ?? "").trim().toLowerCase();
  if (q) {
    clauses.push(
      "(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(domain) LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  if (options.category && isCategory(options.category)) {
    clauses.push("category = ?");
    params.push(options.category);
  }

  const sort: SortKey = options.sort ?? "newest";
  const orderBy =
    sort === "mostVotes"
      ? "vote_count DESC, created_at DESC"
      : "created_at DESC";

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const rows = getDb()
      .prepare(
        `SELECT ${REPORT_COLUMNS} FROM reports ${where} ORDER BY ${orderBy}`
      )
      .all(...params) as Record<string, unknown>[];
    return rows.map(rowToReport);
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}

export interface VoteResult {
  ok: boolean;
  voteCount?: number;
  error?: string;
  retryAfterMs?: number;
}

const VOTE_COOLDOWN_MS = 1200;

/**
 * Records one upvote, with the cooldown window persisted in the database so
 * it survives restarts. STAGE 3 replaces this with durable, deduplicated
 * per-visitor voting.
 */
export function voteOnReport(id: string, clientKey: string): VoteResult {
  const db = getDb();

  try {
    const row = db
      .prepare(`SELECT vote_count FROM reports WHERE id = ?`)
      .get(id) as { vote_count: number } | undefined;
    if (!row) {
      return { ok: false, error: "Report not found." };
    }

    const now = Date.now();
    const cooldownKey = `${id}:${clientKey}`;
    const lastRow = db
      .prepare(`SELECT last_vote_at FROM vote_cooldowns WHERE cooldown_key = ?`)
      .get(cooldownKey) as { last_vote_at: number } | undefined;

    const last = lastRow ? Number(lastRow.last_vote_at) : 0;
    if (now - last < VOTE_COOLDOWN_MS) {
      return {
        ok: false,
        error: "You're voting too quickly. Please wait a moment.",
        retryAfterMs: VOTE_COOLDOWN_MS - (now - last),
      };
    }

    const tx = db.prepare(
      `UPDATE reports SET vote_count = vote_count + 1 WHERE id = ?`
    );
    tx.run(id);
    db.prepare(
      `INSERT INTO vote_cooldowns (cooldown_key, last_vote_at) VALUES (?, ?)
       ON CONFLICT(cooldown_key) DO UPDATE SET last_vote_at = excluded.last_vote_at`
    ).run(cooldownKey, now);

    const updated = db
      .prepare(`SELECT vote_count FROM reports WHERE id = ?`)
      .get(id) as { vote_count: number };

    return { ok: true, voteCount: Number(updated.vote_count) };
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) throw cause;
    throw new StorageUnavailableError(cause);
  }
}
