import { prisma } from "@/lib/prisma";
import { getLocale, isLocale, t, field, productsLabel } from "@/lib/i18n";
import { isJunkText } from "@/lib/content-filter";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300;
export const maxDuration = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  return {
    title: t(locale, "brands_title"),
    alternates: {
      canonical: `/${locale}/brands`,
      languages: { ru: "/ru/brands", en: "/en/brands" },
    },
  };
}

export default async function BrandsPage({
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

  const brandsRaw = await prisma.manufacturer.findMany({
    where: {
      published: true,
      products: { some: { published: true } },
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { published: true } } } } },
  });
  const brands = brandsRaw.filter(
    (b) => !isJunkText(b.slug) && !isJunkText(b.name)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "brands_title") },
        ]}
      />
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">
        {t(locale, "brands_title")}
      </h1>
      <form className="mb-8 max-w-md">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, "search_placeholder")}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/${locale}/brands/${b.slug}`}
            className="border border-slate-200 bg-white p-5 transition hover:border-brand-400"
          >
            <h2 className="font-semibold text-slate-900">{b.name}</h2>
            {field(locale, b.descriptionRu, b.descriptionEn) && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {field(locale, b.descriptionRu, b.descriptionEn)}
              </p>
            )}
            <p className="mt-3 text-xs text-brand-700">
              {b._count.products} {productsLabel(locale, b._count.products)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
