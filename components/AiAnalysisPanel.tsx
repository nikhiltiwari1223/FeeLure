"use client";

// Review panel for AI findings. Everything here is a SUGGESTION: the user can
// edit every field, apply fields to the manual report form, or discard the
// whole analysis. Nothing reaches the database until the user submits.

import { CATEGORIES } from "@/lib/format";
import type { GeminiAnalysisResult, GeminiFinding } from "@/lib/gemini";

interface Props {
  analysis: GeminiAnalysisResult;
  onChange: (next: GeminiAnalysisResult) => void;
  onApply: (finding: GeminiFinding) => void;
  onDiscard: () => void;
  appliedNotes: string;
  onAppliedNotesChange: (value: string) => void;
}

export default function AiAnalysisPanel({
  analysis,
  onChange,
  onApply,
  onDiscard,
  appliedNotes,
  onAppliedNotesChange,
}: Props) {
  function updateFinding(index: number, patch: Partial<GeminiFinding>) {
    const findings = analysis.findings.map((f, i) =>
      i === index ? { ...f, ...patch } : f
    );
    onChange({ ...analysis, findings });
  }

  return (
    <div
      className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5"
      aria-label="AI screenshot analysis review"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-extrabold text-navy-900">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-navy-900"
          >
            ✦
          </span>
          AI-assisted first read — review before publishing
        </h3>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
        >
          Discard analysis
        </button>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-amber-900">
        These are <strong>potential concerns read from your screenshot</strong>{" "}
        — not confirmed deception and not a scan of the website. Edit anything
        that is wrong, apply what is useful, or discard it all. Your report is
        only what you publish.
      </p>

      {!analysis.issuesFound ? (
        <div className="mt-4 rounded-lg border border-navy-100 bg-white p-4 text-sm text-navy-700">
          <p className="font-bold text-navy-900">
            No obvious dark-pattern signals visible.
          </p>
          <p className="mt-1 leading-relaxed text-navy-600">
            The AI did not find visible fee tricks, pre-ticked boxes, or
            misleading wording in this screenshot. That is not a guarantee —
            just publish your report with your own description.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-navy-100 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-navy-500">
              Plain-language summary (editable)
            </p>
            <textarea
              value={analysis.summary}
              onChange={(e) =>
                onChange({ ...analysis, summary: e.target.value })
              }
              rows={2}
              className="mt-2 w-full rounded-md border border-navy-200 p-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {analysis.findings.map((finding, index) => (
            <div
              key={index}
              className="rounded-lg border border-navy-100 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-extrabold text-amber-800 ring-1 ring-amber-300">
                  {finding.amount ?? "potential signal"}
                </span>
                <select
                  value={finding.category ?? ""}
                  onChange={(e) =>
                    updateFinding(index, { category: e.target.value || null })
                  }
                  aria-label="Finding category"
                  className="rounded-md border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold focus:border-amber-400 focus:outline-none"
                >
                  <option value="">Category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="mt-3 block text-xs font-bold text-navy-700">
                Finding
                <input
                  value={finding.finding}
                  onChange={(e) =>
                    updateFinding(index, { finding: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-navy-200 p-2 text-sm font-normal focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>

              <label className="mt-2 block text-xs font-bold text-navy-700">
                Visible evidence (exact wording/element)
                <textarea
                  value={finding.evidence}
                  onChange={(e) =>
                    updateFinding(index, { evidence: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-navy-200 p-2 text-sm font-normal focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>

              <p className="mt-2 text-xs leading-relaxed text-navy-500">
                <strong className="text-navy-600">Limitations:</strong>{" "}
                {finding.limitations || "—"}
              </p>

              <button
                type="button"
                onClick={() => onApply(finding)}
                className="mt-3 rounded-lg bg-navy-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
              >
                Apply to my report
              </button>
            </div>
          ))}

          <div className="rounded-lg border border-navy-100 bg-white p-4">
            <label className="block text-xs font-bold text-navy-700">
              Extra notes from the AI read (appended to your description)
              <textarea
                value={appliedNotes}
                onChange={(e) => onAppliedNotesChange(e.target.value)}
                rows={3}
                maxLength={1200}
                placeholder="Optional — anything from the analysis you want to keep in your own words…"
                className="mt-1 w-full rounded-md border border-navy-200 p-2 text-sm font-normal focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <p className="mt-1 text-xs text-navy-400">
              Included in the published report, clearly attributed as part of
              your description.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
