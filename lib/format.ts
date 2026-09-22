// Shared constants and small helpers used by both the API routes and the UI.

export const CATEGORIES = [
  "Hidden Fees",
  "Pre-checked Add-ons",
  "Hidden Subscription",
  "Difficult Cancellation",
  "Misleading Wording",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}

export const SORTS = ["newest", "mostVotes"] as const;
export type SortKey = (typeof SORTS)[number];

export function isSortKey(value: unknown): value is SortKey {
  return value === "newest" || value === "mostVotes";
}

export const MAX_TITLE_LENGTH = 120;
export const MIN_TITLE_LENGTH = 3;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MIN_DESCRIPTION_LENGTH = 10;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const URL_PATTERN = /^https?:\/\/\S+$/i;

/** Strict-enough URL check: must be http(s) and have a plausible hostname. */
export function isValidReportUrl(value: string): boolean {
  if (!URL_PATTERN.test(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return host.includes(".") && !host.endsWith(".") && !host.includes("..");
  } catch {
    return false;
  }
}

/** Human-readable domain for cards (e.g. "streamflix.example"). */
export function domainFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return rawUrl;
  }
}

/** Loose check used only for prefilling a domain hint in the UI. */
export function looksLikeDomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    value.trim()
  );
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
