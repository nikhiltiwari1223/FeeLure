import type { Metadata } from "next";
import SubmitReportForm from "@/components/SubmitReportForm";

export const metadata: Metadata = {
  title: "Submit a report",
  description:
    "Report a suspected dark pattern or hidden fee to the FeeLure community index. URL-only reports are welcome.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">
          Report a Pattern
        </h1>
        <p className="mt-2 text-navy-600">
          Tell the community what you saw. A screenshot is optional — a clear
          URL-only report is still valuable, and it is clearly labelled as based
          on your description.
        </p>
      </header>
      <div className="mt-8">
        <SubmitReportForm />
      </div>
    </div>
  );
}
