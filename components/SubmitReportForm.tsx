"use client";

// Submit Report form (STAGE 1). Client-side validation, loading/success/error
// states, screenshot prefill via object URL. POSTs to /api/reports.
// STAGE 4 will add the "Analyze Screenshot" step before publishing.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AiAnalysisPanel from "./AiAnalysisPanel";
import type { GeminiAnalysisResult, GeminiFinding } from "@/lib/gemini";
import {
  CATEGORIES,
  formatBytes,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
  isCategory,
} from "@/lib/format";

type FormState = "idle" | "submitting" | "success";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface FieldErrors {
  title?: string;
  url?: string;
  category?: string;
  description?: string;
  screenshot?: string;
  form?: string;
}

export default function SubmitReportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // AI analysis state (Stage 3)
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [appliedNotes, setAppliedNotes] = useState("");

  function pickFile(selected: File | null) {
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
      setErrors((e) => ({
        ...e,
        screenshot: "Screenshots must be a PNG, JPG, or WebP image.",
      }));
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setErrors((e) => ({
        ...e,
        screenshot: `Screenshot is ${formatBytes(selected.size)} — the limit is 5 MB.`,
      }));
      return;
    }
    setErrors((e) => ({ ...e, screenshot: undefined }));
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function analyzeScreenshot() {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const body = new FormData();
      body.append("screenshot", file);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: GeminiAnalysisResult;
        error?: string;
      };
      if (response.ok && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysisError(
          data.error ?? "AI analysis failed. You can still publish your report manually."
        );
      }
    } catch {
      setAnalysisError("Network error during AI analysis. You can still publish your report manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function applyFinding(finding: GeminiFinding) {
    if (finding.category && isCategory(finding.category) && !category) {
      setCategory(finding.category);
      setTouched((t) => ({ ...t, category: true }));
    }
    if (!description.trim()) {
      setDescription(
        `${finding.finding} Visible on the screen: ${finding.evidence}`.slice(
          0,
          MAX_DESCRIPTION_LENGTH
        )
      );
      setTouched((t) => ({ ...t, description: true }));
    }
    const line = `- Potential signal${finding.amount ? ` (${finding.amount})` : ""}: ${finding.finding} — visible: ${finding.evidence}`;
    setAppliedNotes((n) =>
      (n ? `${n}\n${line}` : `AI-assisted screenshot read (reviewed by me):\n${line}`).slice(0, 1200)
    );
  }

  function discardAnalysis() {
    setAnalysis(null);
    setAnalysisError(null);
    setAppliedNotes("");
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setErrors((e) => ({ ...e, screenshot: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validateLocal(): FieldErrors {
    const next: FieldErrors = {};
    const t = title.trim();
    if (!t) next.title = "A report title is required.";
    else if (t.length < MIN_TITLE_LENGTH)
      next.title = `Title must be at least ${MIN_TITLE_LENGTH} characters.`;
    else if (t.length > MAX_TITLE_LENGTH)
      next.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;

    const u = url.trim();
    if (!u) next.url = "A website URL is required.";
    else if (!/^https?:\/\//i.test(u))
      next.url = "The URL must start with http:// or https://.";
    else {
      try {
        const parsed = new URL(u);
        if (!parsed.hostname.includes(".") || parsed.hostname.endsWith("."))
          next.url = "That does not look like a valid website URL.";
      } catch {
        next.url = "That does not look like a valid website URL.";
      }
    }

    if (!category) next.category = "Choose the suspected dark-pattern category.";

    const d = description.trim();
    if (!d) next.description = "Please describe what you experienced.";
    else if (d.length < MIN_DESCRIPTION_LENGTH)
      next.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`;
    else if (d.length > MAX_DESCRIPTION_LENGTH)
      next.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const localErrors = validateLocal();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setTouched({ title: true, url: true, category: true, description: true });
      return;
    }
    setErrors({});

    setSubmitting(true);
    setFormState("submitting");

    try {
      const body = new FormData();
      body.append("title", title.trim());
      body.append("url", url.trim());
      body.append("category", category);
      body.append(
        "description",
        appliedNotes.trim()
          ? `${description.trim()}\n\n${appliedNotes.trim()}`.slice(
              0,
              MAX_DESCRIPTION_LENGTH
            )
          : description.trim()
      );
      if (file) body.append("screenshot", file);

      const response = await fetch("/api/reports", { method: "POST", body });

      if (response.status === 201) {
        const data = (await response.json()) as { report?: { id?: string } };
        setFormState("success");
        if (data.report?.id) {
          router.prefetch(`/reports/${data.report.id}`);
        }
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        errors?: FieldErrors;
        error?: string;
      };
      if (data.errors) {
        setErrors(data.errors);
      } else {
        setErrors({
          form:
            data.error ??
            "Something went wrong while publishing your report. Please try again.",
        });
      }
      setFormState("idle");
    } catch {
      setErrors({
        form: "Network error — check your connection and try again.",
      });
      setFormState("idle");
    } finally {
      setSubmitting(false);
    }
  }

  if (formState === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="h-7 w-7 text-emerald-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-navy-900">
          Report published 🎣
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          Your report is now live in the community index. Others can view the
          evidence and vote on it.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/reports"
            className="rounded-lg bg-navy-900 px-6 py-3 font-bold text-white transition hover:bg-navy-800"
          >
            Explore Reports
          </Link>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setUrl("");
              setCategory("");
              setDescription("");
              clearFile();
              setTouched({});
              setErrors({});
              setFormState("idle");
            }}
            className="rounded-lg border-2 border-navy-200 px-6 py-3 font-bold text-navy-700 transition hover:border-navy-400"
          >
            Report another pattern
          </button>
        </div>
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-navy-900 shadow-sm transition placeholder:text-navy-300 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-400 bg-red-50 focus:ring-red-400"
        : "border-navy-200 bg-white focus:border-amber-400 focus:ring-amber-400"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.form && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errors.form}
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-bold text-navy-800"
        >
          Report title <span className="text-red-600">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          placeholder="e.g. Extra insurance added at checkout"
          maxLength={MAX_TITLE_LENGTH + 20}
          aria-invalid={Boolean(touched.title && errors.title)}
          aria-describedby={touched.title && errors.title ? "title-error" : undefined}
          className={inputClass(Boolean(touched.title && errors.title))}
        />
        {touched.title && errors.title && (
          <p id="title-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.title}
          </p>
        )}
      </div>

      {/* URL */}
      <div>
        <label htmlFor="url" className="block text-sm font-bold text-navy-800">
          Website URL <span className="text-red-600">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, url: true }))}
          placeholder="https://example-shop.com/checkout"
          aria-invalid={Boolean(touched.url && errors.url)}
          aria-describedby={
            touched.url && errors.url ? "url-error" : "url-hint"
          }
          className={inputClass(Boolean(touched.url && errors.url))}
        />
        {touched.url && errors.url ? (
          <p id="url-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.url}
          </p>
        ) : (
          <p id="url-hint" className="mt-1.5 text-xs text-navy-500">
            FeeLure records your experience — it never visits or inspects the
            live website.
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-bold text-navy-800"
        >
          Suspected category <span className="text-red-600">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, category: true }))}
          aria-invalid={Boolean(touched.category && errors.category)}
          aria-describedby={
            touched.category && errors.category ? "category-error" : undefined
          }
          className={inputClass(Boolean(touched.category && errors.category))}
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {touched.category && errors.category && (
          <p id="category-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.category}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-bold text-navy-800"
        >
          What happened? <span className="text-red-600">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          placeholder="Describe the flow: which page, what you were promised, what you were actually charged, and when you noticed."
          maxLength={MAX_DESCRIPTION_LENGTH}
          aria-invalid={Boolean(touched.description && errors.description)}
          aria-describedby="description-counter"
          className={inputClass(Boolean(touched.description && errors.description))}
        />
        {touched.description && errors.description && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.description}
          </p>
        )}
        <p id="description-counter" className="mt-1.5 text-right text-xs text-navy-400">
          {description.trim().length}/{MAX_DESCRIPTION_LENGTH}
        </p>
      </div>

      {/* Screenshot */}
      <div>
        <label
          htmlFor="screenshot"
          className="block text-sm font-bold text-navy-800"
        >
          Screenshot <span className="font-normal text-navy-500">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-navy-500">
          PNG, JPG, or WebP up to 5 MB. Adding one unlocks optional AI-assisted analysis.
        </p>
        <input
          ref={fileInputRef}
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full cursor-pointer rounded-lg border border-navy-200 bg-white text-sm text-navy-600 shadow-sm file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-navy-800"
        />
        {errors.screenshot && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {errors.screenshot}
          </p>
        )}
        {previewUrl && (
          <div className="mt-3 flex items-center gap-4 rounded-lg border border-navy-100 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview of the screenshot you attached"
              className="h-20 w-28 rounded border border-navy-100 object-cover"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold text-navy-800">
                {file?.name}
              </p>
              <p className="text-xs text-navy-500">
                {file ? formatBytes(file.size) : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="rounded-md px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        )}

        {/* Analyze button — only when a screenshot is attached and not yet analyzed */}
        {file && !analysis && (
          <div className="mt-3">
            <button
              type="button"
              onClick={analyzeScreenshot}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-navy-900 bg-white px-4 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 animate-spin"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing screenshot…
                </>
              ) : (
                <>
                  <span aria-hidden="true">✦</span>
                  Analyze screenshot with Gemini
                </>
              )}
            </button>
            <p className="mt-1.5 text-xs text-navy-500">
              Optional. The AI reads only your screenshot — FeeLure never
              visits the website. You review and edit all findings before
              publishing.
            </p>
          </div>
        )}

        {analysisError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <p className="font-bold">AI analysis unavailable</p>
            <p className="mt-0.5 leading-relaxed">{analysisError}</p>
          </div>
        )}

        {analysis && (
          <div className="mt-4">
            <AiAnalysisPanel
              analysis={analysis}
              onChange={setAnalysis}
              onApply={applyFinding}
              onDiscard={discardAnalysis}
              appliedNotes={appliedNotes}
              onAppliedNotesChange={setAppliedNotes}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="border-t border-navy-100 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-6 py-3.5 font-bold text-navy-900 shadow transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Publishing…
            </>
          ) : (
            "Publish report"
          )}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-navy-500">
          By publishing, you confirm this is your honest first-hand experience.
          Reports describe suspected <strong>design patterns</strong> — they are
          not legal claims against any company.
        </p>
      </div>
    </form>
  );
}
