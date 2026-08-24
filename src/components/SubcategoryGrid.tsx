import Link from "next/link";
import Image from "next/image";
import { Locale, field } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";

type Sub = {
  slug: string;
  nameRu: string;
  nameEn: string;
  image?: string | null;
  count: number;
};

export function SubcategoryGrid({
  locale,
  items,
  resultsLabel,
  heading,
}: {
  locale: Locale;
  items: Sub[];
  resultsLabel: string;
  heading?: string;
}) {
  if (!items.length) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
        {heading ||
          (locale === "ru" ? "Подкатегории" : "Subcategories")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((ch) => (
          <Link
            key={ch.slug}
            href={`/${locale}/catalog/${ch.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm transition hover:border-green/30 hover:shadow-md"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg-soft">
              {ch.image ? (
                <Image
                  src={ch.image}
                  alt={field(locale, ch.nameRu, ch.nameEn)}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-extrabold text-green/40">
                  {field(locale, ch.nameRu, ch.nameEn).slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink group-hover:text-green">
                {field(locale, ch.nameRu, ch.nameEn)}
              </p>
              <p className="text-xs text-muted">
                {ch.count} {resultsLabel}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-green" />
          </Link>
        ))}
      </div>
    </div>
  );
}
