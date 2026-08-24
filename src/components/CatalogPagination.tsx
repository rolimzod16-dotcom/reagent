import Link from "next/link";

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 9) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const raw = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1]);
  const nums = [...raw]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

export function CatalogPagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const items = pageWindow(page, pages);

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-green"
        >
          ←
        </Link>
      ) : null}
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`e${i}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            className={`min-w-9 rounded-md px-3 py-1.5 text-center text-sm ${
              item === page
                ? "bg-green text-white"
                : "border border-line text-slate-700 hover:border-green"
            }`}
          >
            {item}
          </Link>
        )
      )}
      {page < pages ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-green"
        >
          →
        </Link>
      ) : null}
    </nav>
  );
}
