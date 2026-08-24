"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locale, t } from "@/lib/i18n";
import { ChevronDown, Filter, X } from "lucide-react";
import type { FilterCategory } from "@/lib/catalog-nav";

export type { FilterCategory };

type Props = {
  locale: Locale;
  categories: FilterCategory[];
  manufacturers: { slug: string; name: string }[];
  current: {
    category?: string;
    manufacturer?: string;
    sort?: string;
    q?: string;
  };
  basePath?: string;
  directoryMode?: boolean;
};

export function CatalogFilters({
  locale,
  categories,
  manufacturers,
  current,
  basePath,
  directoryMode = false,
}: Props) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openParents, setOpenParents] = useState<Set<string>>(() =>
    slugsWithChildren(categories)
  );

  function toggleParent(slug: string) {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function href(overrides: Record<string, string | undefined>) {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (next.manufacturer) params.set("manufacturer", next.manufacturer);
    if (next.sort) params.set("sort", next.sort);
    if (next.q) params.set("q", next.q);
    const s = params.toString();
    const path = next.category
      ? `/${locale}/catalog/${next.category}`
      : `/${locale}/catalog`;
    return s ? `${path}?${s}` : path;
  }

  const panel = (
    <div className="space-y-7">
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {locale === "ru" ? "Категории" : "Categories"}
        </h2>
        <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
          <li>
            <Link
              href={href({ category: undefined })}
              className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                !current.category
                  ? "bg-green-soft font-semibold text-green"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t(locale, "catalog_all")}
            </Link>
          </li>

          {categories.map((c) => (
            <FilterBranch
              key={c.slug}
              node={c}
              depth={0}
              current={current.category}
              openParents={openParents}
              toggleParent={toggleParent}
              hrefFor={href}
            />
          ))}
        </ul>
      </div>

      {!directoryMode && (
      <>
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {t(locale, "catalog_manufacturer")}
        </h3>
        <ul className="max-h-48 space-y-0.5 overflow-y-auto">
          <li>
            <Link
              href={href({ manufacturer: undefined })}
              className={`block rounded-xl px-3 py-2 text-sm ${
                !current.manufacturer
                  ? "bg-green-soft font-semibold text-green"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              —
            </Link>
          </li>
          {manufacturers.map((m) => (
            <li key={m.slug}>
              <Link
                href={href({ manufacturer: m.slug })}
                className={`block rounded-xl px-3 py-2 text-sm ${
                  current.manufacturer === m.slug
                    ? "bg-green-soft font-semibold text-green"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {t(locale, "catalog_sort")}
        </h3>
        <div className="flex flex-col gap-1">
          <Link
            href={href({ sort: "new" })}
            className={`rounded-xl px-3 py-2 text-sm ${
              current.sort === "new"
                ? "bg-green-soft font-semibold text-green"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(locale, "catalog_sort_new")}
          </Link>
          <Link
            href={href({ sort: "name" })}
            className={`rounded-xl px-3 py-2 text-sm ${
              !current.sort || current.sort === "name"
                ? "bg-green-soft font-semibold text-green"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(locale, "catalog_sort_name")}
          </Link>
        </div>
      </div>
      </>
      )}

      <button
        type="button"
        onClick={() => router.push(`/${locale}/catalog`)}
        className="w-full rounded-full border border-line py-2.5 text-sm font-medium text-slate-600 transition hover:border-green hover:text-green"
      >
        {t(locale, "catalog_clear")}
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-line bg-white p-5 shadow-sm">
          {panel}
        </div>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm"
        >
          <Filter className="h-4 w-4 text-green" />
          {t(locale, "mobile_filters")}
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm">
            <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-extrabold tracking-tight">
                  {t(locale, "catalog_filters")}
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full p-2 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {panel}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn btn-primary mt-6 w-full"
              >
                {t(locale, "apply_filters")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function slugsWithChildren(
  nodes: FilterCategory[],
  acc = new Set<string>()
): Set<string> {
  for (const n of nodes) {
    if (n.children?.length) {
      acc.add(n.slug);
      slugsWithChildren(n.children, acc);
    }
  }
  return acc;
}

function branchContains(node: FilterCategory, slug?: string): boolean {
  if (!slug) return false;
  if (node.slug === slug) return true;
  return node.children.some((ch) => branchContains(ch, slug));
}

function FilterBranch({
  node,
  depth,
  current,
  openParents,
  toggleParent,
  hrefFor,
}: {
  node: FilterCategory;
  depth: number;
  current?: string;
  openParents: Set<string>;
  toggleParent: (slug: string) => void;
  hrefFor: (overrides: Record<string, string | undefined>) => string;
}) {
  const hasChildren = node.children.length > 0;
  const active = current === node.slug;
  const childActive = !active && branchContains(node, current);
  const expanded = openParents.has(node.slug) || childActive;
  const pad = depth === 0 ? "px-3 py-2.5 text-sm" : "px-2.5 py-2 text-[13px]";

  return (
    <li className={depth === 0 ? "mt-0.5" : ""}>
      <div className="flex items-center gap-0.5">
        <Link
          href={hrefFor({ category: node.slug })}
          className={`flex min-w-0 flex-1 items-center justify-between rounded-xl ${pad} transition ${
            active
              ? "bg-green-soft font-semibold text-green"
              : childActive
                ? "font-semibold text-green"
                : depth === 0
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-green"
          }`}
        >
          <span className="truncate">{node.name}</span>
          <span className="ml-2 shrink-0 text-[11px] text-slate-400">
            {node.count}
          </span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => toggleParent(node.slug)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-green"
            aria-label="toggle"
          >
            <ChevronDown
              className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-line pl-2">
          {node.children.map((ch) => (
            <FilterBranch
              key={ch.slug}
              node={ch}
              depth={depth + 1}
              current={current}
              openParents={openParents}
              toggleParent={toggleParent}
              hrefFor={hrefFor}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
