import Link from "next/link";
import CategoryBadge from "./CategoryBadge";
import { formatDate } from "@/lib/format";
import type { Report } from "@/lib/reports";

export default function ReportCard({ report }: { report: Report }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="group flex h-full flex-col rounded-xl border border-navy-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      aria-label={`Report: ${report.title} on ${report.domain}`}
    >
      {/* Screenshot thumbnail (or a clean placeholder when none exists). */}
      <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-navy-100">
        {report.imageUrl ? (
          // plain <img>: keeps Stage 1 self-contained for arbitrary uploads
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.imageUrl}
            alt={`Screenshot submitted as evidence for ${report.domain}`}
            className="h-40 w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-navy-400">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-8 w-8"
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M3 9h18M8 4v5" />
            </svg>
            <span className="text-xs font-medium">No screenshot</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <CategoryBadge category={report.category} />
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
            aria-label={`${report.voteCount} community votes`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path d="M10 3l6 7h-3.5v7h-5v-7H4l6-7z" />
            </svg>
            {report.voteCount}
          </span>
        </div>

        <h3 className="font-bold leading-snug text-navy-900 group-hover:text-navy-700">
          {report.title}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-navy-600">
          {report.description}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-navy-100 pt-3 text-xs text-navy-500">
          <span className="truncate font-semibold text-navy-700">
            {report.domain}
          </span>
          <time dateTime={report.createdAt}>
            {formatDate(report.createdAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}
