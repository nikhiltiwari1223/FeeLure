import type { Metadata } from "next";
import CommunityIndex from "@/components/CommunityIndex";

export const metadata: Metadata = {
  title: "Community Index",
  description:
    "Browse community reports of suspected dark patterns, hidden fees, and deceptive subscription designs.",
};

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">
          Community Index
        </h1>
        <p className="mt-2 max-w-2xl text-navy-600">
          Real reports from real visitors. Sort by the newest submissions or the
          most community votes.
        </p>
      </header>
      <div className="mt-8">
        <CommunityIndex />
      </div>
    </div>
  );
}
