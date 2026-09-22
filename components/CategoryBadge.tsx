import { CATEGORIES, type Category } from "@/lib/format";

/**
 * Small visual handle for a suspected dark-pattern category. Navy/amber
 * palette: amber highlights are reserved for the "hottest" categories.
 */
export default function CategoryBadge({ category }: { category: Category }) {
  const hot = category === "Hidden Fees" || category === "Hidden Subscription";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
        hot
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
          : "bg-navy-100 text-navy-700 ring-1 ring-navy-200"
      }`}
    >
      {hot && (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3 w-3 fill-current"
        >
          <path d="M10 2l1.8 4.6L16.5 7l-3.6 3.2.9 4.8L10 12.8 6.2 15l.9-4.8L3.5 7l4.7-.4L10 2z" />
        </svg>
      )}
      {category}
      <span className="sr-only">
        – suspected dark pattern category, one of: {CATEGORIES.join(", ")}
      </span>
    </span>
  );
}
