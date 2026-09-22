import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:px-6">
        <div>
          <p className="font-extrabold text-white">
            Fee<span className="text-amber-400">Lure</span>
          </p>
          <p className="mt-0.5 text-xs text-navy-300">
            See the catch before you click.
          </p>
        </div>
        <p className="max-w-md text-center text-xs leading-relaxed text-navy-300 sm:text-right">
          FeeLure is a community reporting portal. Reports reflect individual
          experiences and AI-assisted observations about{" "}
          <em>interface designs</em> — they are not legal claims against any
          company. Nothing here inspects or verifies live websites.
        </p>
      </div>
    </footer>
  );
}
