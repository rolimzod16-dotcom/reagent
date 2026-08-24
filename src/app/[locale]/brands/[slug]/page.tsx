import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { getBrandPagePayload } from "@/lib/catalog-queries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 300;
export const maxDuration = 20;

type SP = Promise<{ page?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const data = await getBrandPagePayload({ slug, page: 1 });
  if (!data) return {};
  return {
    title: data.brand.name,
    description:
      field(locale, data.brand.descriptionRu, data.brand.descriptionEn) ||
      data.brand.name,
    alternates: {
      canonical: `/${locale}/brands/${slug}`,
      languages: {
        ru: `/ru/brands/${slug}`,
        en: `/en/brands/${slug}`,
      },
    },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: SP;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const data = await getBrandPagePayload({ slug, page, perPage: 24 });
  if (!data) notFound();

  const { brand, products, total, perPage } = data;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const cats = [
    ...new Map(
      products.map((p) => [
        p.category.slug,
        field(locale, p.category.nameRu, p.category.nameEn),
      ])
    ).entries(),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { href: `/${locale}/brands`, label: t(locale, "brands_title") },
          { label: brand.name },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">{brand.name}</h1>
      {field(locale, brand.descriptionRu, brand.descriptionEn) && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {field(locale, brand.descriptionRu, brand.descriptionEn)}
        </p>
      )}
      <p className="mt-2 text-sm text-slate-500">
        {total} {t(locale, "brands_products")}
      </p>
      {cats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map(([catSlug, name]) => (
            <span
              key={catSlug}
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800"
            >
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} locale={locale} product={p} />
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(pages, 40) }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={`/${locale}/brands/${slug}?page=${p}`}
                className={`min-w-9 rounded-md px-3 py-1.5 text-center text-sm ${
                  p === page
                    ? "bg-green text-white"
                    : "border border-line text-slate-700"
                }`}
              >
                {p}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
