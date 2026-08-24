import Link from "next/link";
import { Locale, field, t } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";

export type DirectoryChild = {
  slug: string;
  nameRu: string;
  nameEn: string;
};

export type DirectoryItem = {
  slug: string;
  nameRu: string;
  nameEn: string;
  image?: string | null;
  children?: DirectoryChild[];
};

export function CategoryDirectory({
  locale,
  items,
}: {
  locale: Locale;
  items: DirectoryItem[];
}) {
  if (!items.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const name = field(locale, item.nameRu, item.nameEn);
        const kids = item.children || [];
        const preview = kids.slice(0, 8);
        const extra = kids.length - preview.length;

        return (
          <article
            key={item.slug}
            className="rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-green/30 hover:shadow-md"
          >
            <Link
              href={`/${locale}/catalog/${item.slug}`}
              className="group flex items-start gap-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-soft text-lg font-extrabold text-green">
                {name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold leading-snug text-ink group-hover:text-green">
                  {name}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {kids.length > 0
                    ? `${kids.length} ${t(locale, "catalog_subcategories")}`
                    : t(locale, "catalog_on_request")}
                </p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-green" />
            </Link>

            {preview.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3">
                {preview.map((ch) => (
                  <li key={ch.slug}>
                    <Link
                      href={`/${locale}/catalog/${ch.slug}`}
                      className="block truncate text-sm text-slate-600 hover:text-green"
                    >
                      {field(locale, ch.nameRu, ch.nameEn)}
                    </Link>
                  </li>
                ))}
                {extra > 0 && (
                  <li>
                    <Link
                      href={`/${locale}/catalog/${item.slug}`}
                      className="text-xs font-bold text-green"
                    >
                      {locale === "ru"
                        ? `Ещё ${extra} →`
                        : `${extra} more →`}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
