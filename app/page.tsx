import Link from "next/link";
import { listReports } from "@/lib/reports";
import { CATEGORIES } from "@/lib/format";
import DemoShowcase from "@/components/DemoShowcase";

export const dynamic = "force-dynamic";

const PROBLEMS = [
  {
    title: "Hidden fees",
    body: "The price looks clean until the last step, where service, processing, or \"insurance\" fees quietly inflate your total.",
  },
  {
    title: "Pre-checked add-ons",
    body: "Extra products or paid tiers are ticked for you. You pay unless you spot the box and untick it.",
  },
  {
    title: "Hidden subscriptions",
    body: "A one-off purchase turns into a recurring monthly charge that was never clearly announced at sign-up.",
  },
  {
    title: "Difficult cancellation",
    body: "Signing up took one click. Cancelling hides behind phone calls, guilt screens, or maze-like menus.",
  },
  {
    title: "Misleading wording",
    body: "\"Free\" that isn't free, countdown timers that reset, and buttons that say one thing but do another.",
  },
];

export default function HomePage() {
  // Storage problems must never take the landing page down.
  let reportCount = 0;
  let totalVotes = 0;
  try {
    const all = listReports();
    reportCount = all.length;
    totalVotes = all.reduce((sum, r) => sum + r.voteCount, 0);
  } catch {
    // show the hero with zeroed counters; the index page surfaces the error
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300 ring-1 ring-navy-700">
            <span aria-hidden="true">●</span> Consumer safety, community powered
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            See the catch{" "}
            <span className="text-amber-400">before you click.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-100">
            E-commerce sites and subscription services use deceptive designs:
            pre-checked boxes, fake urgency, and hidden recurring fees buried in
            the fine print. FeeLure is a community index where you can report
            and check suspected dark patterns before your wallet pays for them.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/submit"
              className="rounded-lg bg-amber-400 px-6 py-3.5 text-center text-base font-bold text-navy-900 shadow-lg shadow-navy-950/40 transition hover:bg-amber-300"
            >
              Report a Pattern
            </Link>
            <Link
              href="/reports"
              className="rounded-lg border-2 border-navy-400 bg-transparent px-6 py-3.5 text-center text-base font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
            >
              Explore Reports
            </Link>
          </div>
          <p className="mt-6 text-sm text-navy-200">
            {reportCount > 0
              ? `${reportCount} report${reportCount === 1 ? "" : "s"} in the index · ${totalVotes} community vote${totalVotes === 1 ? "" : "s"}`
              : "Be the first to report a pattern — the index grows with every submission."}
          </p>
        </div>
      </section>

      {/* Fictional, clearly-labelled demo (not a real scan) */}
      <DemoShowcase />

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
          How FeeLure works
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Report what you saw",
              body: "Submit a website link, a screenshot of the checkout or sign-up flow, and a short description of what happened.",
            },
            {
              step: "2",
              title: "Get a first read",
              body: "Optional AI-assisted screenshot analysis highlights suspected patterns — you review and edit everything before publishing.",
            },
            {
              step: "3",
              title: "The community weighs in",
              body: "Published reports are browsable and votable, so the clearest evidence rises to the top of the index.",
            },
          ].map((item) => (
            <li key={item.step} className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-extrabold text-navy-900"
              >
                {item.step}
              </span>
              <h3 className="mt-4 font-bold text-navy-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Problem categories */}
      <section className="border-y border-navy-100 bg-white py-16" aria-labelledby="patterns-we-track">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="patterns-we-track" className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
            The patterns we track
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-xl border border-navy-100 bg-navy-50 p-5">
                <h3 className="flex items-center gap-2 font-bold text-navy-900">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-500">
                    <path fillRule="evenodd" d="M8.5 2a.75.75 0 0 0-.73.916L8.1 4.5a6 6 0 0 0-2.6 1.34l-1.42-.83a.75.75 0 0 0-.96 1.14l.3.3-1.06 1.06a.75.75 0 1 0 1.06 1.06l.9-.9a6 6 0 0 0 0 4.66l-.9-.9a.75.75 0 0 0-1.06 1.06l1.06 1.06-.3.3a.75.75 0 0 0 .96 1.14l1.42-.83A6 6 0 0 0 8.1 15.5l-.33 1.58A.75.75 0 0 0 8.5 18h3a.75.75 0 0 0 .73-.916L11.9 15.5a6 6 0 0 0 2.6-1.34l1.42.83a.75.75 0 0 0 .96-1.14l-.3-.3 1.06-1.06a.75.75 0 1 0-1.06-1.06l-.9.9a6 6 0 0 0 0-4.66l.9.9a.75.75 0 0 0 1.06-1.06l-1.06-1.06.3-.3a.75.75 0 0 0-.96-1.14l-1.42.83A6 6 0 0 0 11.9 4.5l.33-1.58A.75.75 0 0 0 11.5 2h-3Z" clipRule="evenodd" />
                  </svg>
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{p.body}</p>
              </div>
            ))}
            <div className="rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 p-5">
              <h3 className="font-bold text-navy-700">Something else?</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                Any other design that pressures or tricks you at payment or
                sign-up fits under <strong>Other</strong> when you report it.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-navy-500">
            Categories in the index: {CATEGORIES.join(" · ")}
          </p>
        </div>
      </section>

      {/* Honest disclaimer */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="transparency">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 id="transparency" className="font-extrabold text-amber-800">
            What FeeLure is — and is not
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-amber-900">
            <li>
              Reports describe <strong>individual experiences and suspected patterns</strong>, not verdicts. Nothing here accuses any company of breaking the law.
            </li>
            <li>
              A URL-only report records what one person experienced — <strong>FeeLure does not visit, inspect, or verify live websites</strong>.
            </li>
            <li>
              AI screenshot analysis is a <strong>first-draft aid</strong>. Findings are labelled as suspected, shown with their limitations, and always reviewed by a human before publishing.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl bg-navy-900 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Spotted a sneaky fee or a box that ticked itself?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-navy-100">
            Two minutes, one screenshot. Help the next shopper see the catch before they click.
          </p>
          <Link
            href="/submit"
            className="mt-7 inline-block rounded-lg bg-amber-400 px-8 py-3.5 font-bold text-navy-900 transition hover:bg-amber-300"
          >
            Report a Pattern
          </Link>
        </div>
      </section>
    </div>
  );
}
