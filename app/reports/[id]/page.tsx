import type { Metadata } from "next";
import ReportDetailView from "@/components/ReportDetailView";
import { getReport } from "@/lib/reports";
import { isStorageAvailable } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const report = getReport(id);
    if (!report) return { title: "Report not found" };
    return { title: report.title };
  } catch {
    return { title: "Report unavailable" };
  }
}

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;

  if (!isStorageAvailable()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-navy-900">
          The report database is unavailable
        </h1>
        <p className="mt-2 text-navy-600">
          FeeLure could not open its storage. This is usually temporary —
          reload the page in a few seconds.
        </p>
        <a
          href="/reports"
          className="mt-6 inline-block rounded-lg bg-navy-900 px-6 py-3 font-bold text-white transition hover:bg-navy-800"
        >
          Back to Community Index
        </a>
      </div>
    );
  }

  let report;
  try {
    report = getReport(id);
  } catch {
    report = undefined;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-navy-900">
          Report not found
        </h1>
        <p className="mt-2 text-navy-600">
          This report may have been removed, or the link is incorrect.
        </p>
        <a
          href="/reports"
          className="mt-6 inline-block rounded-lg bg-navy-900 px-6 py-3 font-bold text-white transition hover:bg-navy-800"
        >
          Back to Community Index
        </a>
      </div>
    );
  }

  return <ReportDetailView report={report} />;
}
