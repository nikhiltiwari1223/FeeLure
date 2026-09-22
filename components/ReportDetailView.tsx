// Report detail view (STAGE 1). Server component: shows the submitted
// evidence, metadata, and voting. The AI-findings card activates in Stage 4.

import VoteButton from "./VoteButton";
import CategoryBadge from "./CategoryBadge";
import { formatDate } from "@/lib/format";
import type { Report } from "@/lib/reports";

export default function ReportDetailView({ report }: { report: Report }) {
  return (
    <article className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm">
      {/* Screenshot */}
      {report.imageUrl ? (
        <figure className="border-b border-navy-100 bg-navy-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.imageUrl}
            alt={`Screenshot submitted as evidence for ${report.domain}`}
            className="mx-auto max-h-[28rem] w-full max-w-4xl object-contain"
          />
          <figcaption className="px-6 py-3 text-xs text-navy-500">
            Screenshot submitted by the reporter
            {report.screenshotName ? ` (${report.screenshotName})` : ""} ·
            shown as-is, not independently verified
          </figcaption>
        </figure>
      ) : (
        <div className="border-b border-dashed border-navy-200 bg-navy-50 px-6 py-10 text-center">
          <p className="font-bold text-navy-800">No screenshot attached</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-navy-600">
            This report relies on the reporter&apos;s written description.
            FeeLure never visits or inspects the live website.
          </p>
        </div>
      )}

      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryBadge category={report.category} />
          <time
            dateTime={report.createdAt}
            className="text-sm text-navy-500"
          >
            Reported {formatDate(report.createdAt)}
          </time>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
          {report.title}
        </h1>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-1.5">
            <dt className="font-bold text-navy-700">Website:</dt>
            <dd>
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all font-semibold text-navy-600 underline decoration-amber-400 decoration-2 underline-offset-2 hover:text-navy-900"
              >
                {report.domain}
              </a>
              <span className="ml-1 text-navy-400">(opens in a new tab)</span>
            </dd>
          </div>
        </dl>

        <section className="mt-6" aria-label="Reporter's description">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy-500">
            What the reporter experienced
          </h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-navy-800">
            {report.description}
          </p>
        </section>

        {/* AI analysis — activated in Stage 4 */}
        <section
          className="mt-8 rounded-xl border border-dashed border-navy-200 bg-navy-50 p-5"
          aria-label="AI-assisted screenshot analysis"
        >
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy-500">
            AI-assisted screenshot analysis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">
            {report.imageUrl
              ? "Coming in the next build: a Gemini-assisted first read of the screenshot, always reviewed and editable by the reporter before it appears here."
              : "Available when a screenshot is attached to the report."}
          </p>
        </section>

        {/* Voting */}
        <div className="mt-8 flex flex-col gap-4 border-t border-navy-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-navy-900">
              Do you trust this report?
            </h2>
            <p className="mt-0.5 text-sm text-navy-500">
              Upvotes surface the clearest evidence in the community index.
            </p>
          </div>
          <VoteButton reportId={report.id} initialCount={report.voteCount} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-navy-400">
          This report reflects one person&apos;s account of a suspected design
          pattern. It is not a legal claim, and FeeLure has not inspected the
          website in question.
        </p>
      </div>
    </article>
  );
}
