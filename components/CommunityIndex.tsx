"use client";

// Community Index browser (STAGE 1): search, category filter, and sort,
// reading from the reports API. Handles loading, empty, and error states.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReportCard from "./ReportCard";
import { CATEGORIES, type SortKey } from "@/lib/format";
import type { Report } from "@/lib/reports";

type LoadState = "loading" | "ready" | "error";

export default function CommunityIndex() {
  const [state, setState] = useState<LoadState>("loading");
  const [reports, setReports] = useState<Report[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // Debounce so typing in the search box does not fire a request per keystroke.
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (category) params.set("category", category);
      params.set("sort", sort);
      const response = await fetch(`/api/reports?${params.toString()}`);
      const data = (await response.json().catch(() => ({}))) as {
        reports?: Report[];
        error?: string;
      };
      if (!response.ok) {
        setErrorMessage(
          data.error ?? "The reports service returned an error. Please try again."
        );
        setState("error");
        return;
      }
      setReports(data.reports ?? []);
      setState("ready");
    } catch {
      setErrorMessage("Network error — could not reach the reports service.");
      setState("error");
    }
  }, [debouncedQ, category, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const hasActiveFilters = Boolean(debouncedQ) || Boolean(category);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-navy-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.4l3.08 3.07a.75.75 0 1 1-1.06 1.06l-3.08-3.07A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <label htmlFor="index-search" className="sr-only">
            Search reports
          </label>
          <input
            id="index-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, description, or domain…"
            className="w-full rounded-lg border border-navy-200 py-2.5 pl-9 pr-3 text-sm shadow-sm placeholder:text-navy-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="index-category" className="sr-only">
            Filter by category
          </label>
          <select
            id="index-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div
            role="group"
            aria-label="Sort reports"
            className="flex overflow-hidden rounded-lg border border-navy-200"
          >
            <button
              type="button"
              onClick={() => setSort("newest")}
              aria-pressed={sort === "newest"}
              className={`px-3.5 py-2.5 text-sm font-bold transition ${
                sort === "newest"
                  ? "bg-navy-900 text-white"
                  : "bg-white text-navy-600 hover:bg-navy-50"
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSort("mostVotes")}
              aria-pressed={sort === "mostVotes"}
              className={`px-3.5 py-2.5 text-sm font-bold transition ${
                sort === "mostVotes"
                  ? "bg-navy-900 text-white"
                  : "bg-white text-navy-600 hover:bg-navy-50"
              }`}
            >
              Most votes
            </button>
          </div>
        </div>
      </div>

      {/* Content states */}
      {state === "loading" && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite" aria-label="Loading reports">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-navy-100 bg-white"
            />
          ))}
        </div>
      )}

      {state === "error" && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
        >
          <p className="font-bold text-red-700">Could not load reports.</p>
          <p className="mt-1 text-sm text-red-600">
            {errorMessage ?? "Please try again in a moment."}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {state === "ready" && reports.length === 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-navy-200 bg-white p-10 text-center">
          <h2 className="text-lg font-extrabold text-navy-900">
            {hasActiveFilters
              ? "No reports match your filters."
              : "The index is empty — for now."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">
            {hasActiveFilters
              ? "Try a different search term or category."
              : "Every entry here comes from a real submission. Be the first to document a pattern you encountered."}
          </p>
          <Link
            href="/submit"
            className="mt-5 inline-block rounded-lg bg-amber-400 px-6 py-3 font-bold text-navy-900 transition hover:bg-amber-300"
          >
            Report a Pattern
          </Link>
        </div>
      )}

      {state === "ready" && reports.length > 0 && (
        <>
          <p className="mt-6 text-sm text-navy-500" aria-live="polite">
            {reports.length} report{reports.length === 1 ? "" : "s"}
            {hasActiveFilters ? " matching your filters" : ""}
          </p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
