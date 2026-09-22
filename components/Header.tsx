import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-900 text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          aria-label="FeeLure home"
        >
          {/* FeeLure mark: a hook (lure) catching a hidden fee tag */}
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="h-8 w-8 shrink-0"
            fill="none"
          >
            <circle cx="16" cy="16" r="14.5" className="fill-amber-400" />
            <path
              d="M10 9c0 6 2.5 12.5 6 12.5S22 15 22 9"
              className="stroke-navy-900"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="22" cy="20" r="2.2" className="fill-navy-900" />
          </svg>
          <span className="text-xl font-extrabold tracking-tight">
            Fee<span className="text-amber-400">Lure</span>
          </span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <li>
              <Link
                href="/reports"
                className="rounded-md px-3 py-2 text-navy-100 transition hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Explore Reports
              </Link>
            </li>
            <li>
              <Link
                href="/submit"
                className="rounded-md bg-amber-400 px-3 py-2 font-bold text-navy-900 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              >
                Report a Pattern
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
