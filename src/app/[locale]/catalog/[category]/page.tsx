import { getLocale, isLocale, t, field, resultsLabel, subcatsLabel } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CatalogFilters } from "@/components/CatalogFilters";
import { CatalogShowcase } from "@/components/CatalogShowcase";
import { CatalogPagination } from "@/components/CatalogPagination";
import { getCategoryPagePayload } from "@/lib/catalog-queries";
import { toFilterCategories } from "@/lib/catalog-nav";
import type { CategoryTreeNode } from "@/lib/catalog";

function subtreeCount(
  nodes: CategoryTreeNode[],
  slug: string
): number | null {
  for (const n of nodes) {
    if (n.slug === slug) return n.count;
    const inner = subtreeCount(n.children, slug);
    if (inner != null) return inner;
  }
  return null;
}
import { CatalogPartnerNote } from "@/components/CatalogPartnerNote";
import { CatalogDownloadLink } from "@/components/CatalogDownloadLink";
import { InquiryForm } from "@/components/InquiryForm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 180;
export const maxDuration = 20;

type SP = Promise<{ manufacturer?: string; sort?: string; page?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale: raw, category: slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const data = await getCategoryPagePayload({
    slug,
    locale,
    page: 1,
  });
  if (!data) return {};
  const name = field(locale, data.category.nameRu, data.category.nameEn);
  return {
    title: name,
    description: name,
    alternates: {
      canonical: `/${locale}/catalog/${slug}`,
      languages: {
        ru: `/ru/catalog/${slug}`,
        en: `/en/catalog/${slug}`,
      },
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: SP;
}) {
  const { locale: raw, category: slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const data = await getCategoryPagePayload({
    slug,
    locale,
    page,
    manufacturer: sp.manufacturer,
    sort: sp.sort,
  });
  if (!data) notFound();

  const {
    category,
    childrenWithCounts,
    tree,
    manufacturers,
    total,
    products,
    perPage,
  } = data;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const headingTotal = subtreeCount(tree, slug) ?? total;
  const catName = field(locale, category.nameRu, category.nameEn);
  const parent = category.parent;
  const liveChildren = childrenWithCounts;

  const crumbs: { href?: string; label: string }[] = [
    { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
    { href: `/${locale}/catalog`, label: t(locale, "catalog_title") },
  ];
  if (parent) {
    crumbs.push({
      href: `/${locale}/catalog/${parent.slug}`,
      label: field(locale, parent.nameRu, parent.nameEn),
    });
  }
  crumbs.push({ label: catName });

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    if (sp.manufacturer) params.set("manufacturer", sp.manufacturer);
    if (sp.sort) params.set("sort", sp.sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s
      ? `/${locale}/catalog/${slug}?${s}`
      : `/${locale}/catalog/${slug}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <Breadcrumbs items={crumbs} />
      <div className="mb-8">
        <p className="section-label">
          {parent
            ? field(locale, parent.nameRu, parent.nameEn)
            : t(locale, "catalog_title")}
        </p>
        <h1 className="mt-2 display-lg text-ink">{catName}</h1>
        <p className="mt-2 text-sm text-muted">
          {headingTotal > 0
            ? `${headingTotal} ${resultsLabel(locale, headingTotal)}`
            : t(locale, "catalog_on_request")}
          {liveChildren.length > 0
            ? ` · ${liveChildren.length} ${subcatsLabel(locale, liveChildren.length)}`
            : ""}
        </p>
        <CatalogDownloadLink locale={locale} variant="outline" className="mt-4" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <CatalogFilters
          locale={locale}
          categories={toFilterCategories(tree, locale)}
          manufacturers={manufacturers.map((m) => ({
            slug: m.slug,
            name: m.name,
          }))}
          current={{
            category: slug,
            manufacturer: sp.manufacturer,
            sort: sp.sort,
          }}
        />
        <div className="min-w-0 flex-1">
          {liveChildren.length > 0 && (
            <CatalogShowcase
              locale={locale}
              heading={
                locale === "ru" ? "Подкатегории" : "Subcategories"
              }
              items={liveChildren.map((ch) => ({
                slug: ch.slug,
                nameRu: ch.nameRu,
                nameEn: ch.nameEn,
                image: ch.image,
                count: ch.count,
                children: (ch.children || []).map((g) => ({
                  slug: g.slug,
                  nameRu: g.nameRu,
                  nameEn: g.nameEn,
                  image: g.image,
                })),
              }))}
            />
          )}

          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
            {locale === "ru" ? "Товары" : "Products"}
          </h2>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <p className="text-sm text-muted">
                {locale === "ru"
                  ? "В этом разделе пока нет публичного списка позиций. Оставьте заявку — подберём ассортимент и пришлём коммерческое предложение."
                  : "This section has no public product list yet. Send an inquiry and we will prepare an assortment and a quote."}
              </p>
              <div className="mt-6">
                <InquiryForm locale={locale} productName={catName} compact />
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} locale={locale} product={p} />
              ))}
            </div>
          )}
          <CatalogPagination page={page} pages={pages} hrefFor={hrefFor} />
          <div className="mt-10">
            <CatalogPartnerNote locale={locale} slug={slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
