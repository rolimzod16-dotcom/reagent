import Link from "next/link";
import Image from "next/image";
import { Locale, field, resultsLabel, subcatsLabel } from "@/lib/i18n";
import { catalogImage } from "@/lib/catalog-images";
import { ChevronRight } from "lucide-react";

export type ShowcaseChild = {
  slug: string;
  nameRu: string;
  nameEn: string;
  image?: string | null;
  count?: number;
  children?: ShowcaseChild[];
};

export type ShowcaseItem = {
  slug: string;
  nameRu: string;
  nameEn: string;
  image?: string | null;
  count: number;
  children?: ShowcaseChild[];
};

export function CatalogShowcase({
  locale,
  items,
  heading,
  compact = false,
}: {
  locale: Locale;
  items: ShowcaseItem[];
  heading?: string;
  compact?: boolean;
}) {
  if (!items.length) return null;
  const preview = compact ? 4 : 8;

  return (
    <div className="mb-10">
      {heading ? (
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-muted">
          {heading}
        </h2>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const name = field(locale, item.nameRu, item.nameEn);
          const src = catalogImage(item.slug, item.image);
          const kids = (item.children || []).filter(
            (c) => c.count === undefined || c.count > 0 || Boolean(c.image)
          );
          const shown = kids.slice(0, preview);
          const extra = kids.length - shown.length;

          return (
            <article
              key={item.slug}
              className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-green/30 hover:shadow-md"
            >
              <Link
                href={`/${locale}/catalog/${item.slug}`}
                className="relative block aspect-[4/3] overflow-hidden bg-bg-soft"
              >
                <Image
                  src={src}
                  alt={name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-deep/90 via-green-deep/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-lg font-extrabold leading-snug text-white">
                    {name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-green-light">
                    {item.count} {resultsLabel(locale, item.count)}
                    {kids.length > 0
                      ? ` · ${kids.length} ${subcatsLabel(locale, kids.length)}`
                      : ""}
                  </p>
                </div>
              </Link>

              {shown.length > 0 ? (
                <ul className="divide-y divide-line">
                  {shown.map((ch) => (
                    <li key={ch.slug}>
                      <Link
                        href={`/${locale}/catalog/${ch.slug}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-green-mist hover:text-green"
                      >
                        <span className="min-w-0 truncate">
                          {field(locale, ch.nameRu, ch.nameEn)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                          {typeof ch.count === "number" ? ch.count : ""}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                  {extra > 0 ? (
                    <li>
                      <Link
                        href={`/${locale}/catalog/${item.slug}`}
                        className="block px-4 py-2.5 text-xs font-bold text-green hover:bg-green-mist"
                      >
                        {locale === "ru"
                          ? `Ещё ${extra} подкатегорий →`
                          : `${extra} more subcategories →`}
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
