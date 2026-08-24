import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getLocale, isLocale, t } from "@/lib/i18n";
import { productSearchWhere } from "@/lib/search";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 120;
export const maxDuration = 20;

function cachedSearch(query: string) {
  return unstable_cache(
    async () =>
      prisma.product.findMany({
        where: {
          published: true,
          ...productSearchWhere(query),
        },
        take: 48,
        include: {
          manufacturer: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      }),
    ["search-v1", query.toLowerCase()],
    { revalidate: 120, tags: ["catalog"] }
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  return { title: t(locale, "search_results") };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const { q } = await searchParams;
  const query = (q || "").trim();

  const products = query ? await cachedSearch(query) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "search_results") },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">
        {t(locale, "search_results")}
        {query ? `: «${query}»` : ""}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {products.length} {t(locale, "catalog_results")}
      </p>
      <form action={`/${locale}/search`} className="mt-6 max-w-xl">
        <input
          name="q"
          defaultValue={query}
          placeholder={t(locale, "search_placeholder")}
          className="w-full rounded-md border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
      </form>
      {products.length === 0 ? (
        <p className="mt-12 text-center text-slate-500">
          {t(locale, "catalog_empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} locale={locale} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
