import { getLocale, isLocale, t, resultsLabel } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CatalogFilters } from "@/components/CatalogFilters";
import { CatalogShowcase } from "@/components/CatalogShowcase";
import { CatalogPagination } from "@/components/CatalogPagination";
import { getCatalogPagePayload } from "@/lib/catalog-queries";
import { catalogNavVisible, toFilterCategories } from "@/lib/catalog-nav";
import { CatalogDownloadLink } from "@/components/CatalogDownloadLink";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_DOMAIN } from "@/lib/site";

export const revalidate = 120;
export const maxDuration = 30;

type SP = Promise<{
  manufacturer?: string;
  sort?: string;
  q?: string;
  page?: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  return buildPageMetadata({
    locale,
    path: "/catalog",
    title:
      locale === "ru"
        ? `Каталог медтехники и реагентов — Таджикистан | ${SITE_DOMAIN}`
        : `Catalog of medical equipment & reagents — Tajikistan | ${SITE_DOMAIN}`,
    description:
      locale === "ru"
        ? `Каталог медицинского оборудования, расходников и лабораторных реагентов для Таджикистана. ПЦР, ИФА, биохимия. Душанбе. B2B, цена по запросу. ${SITE_DOMAIN}`
        : `Medical equipment, consumables and lab reagents catalog for Tajikistan. PCR, ELISA, chemistry. Dushanbe. B2B, price on request.`,
  });
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const listing = Boolean(sp.q || sp.manufacturer);

  const { tree, manufacturers, total, products, perPage } =
    await getCatalogPagePayload({
      locale,
      manufacturer: sp.manufacturer,
      q: sp.q,
      sort: sp.sort,
      page,
      skipProducts: !listing,
    });

  const pages = Math.max(1, Math.ceil(total / perPage));
  const liveTree = tree.filter(catalogNavVisible);
  const filterCats = toFilterCategories(tree, locale);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    if (sp.manufacturer) params.set("manufacturer", sp.manufacturer);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.q) params.set("q", sp.q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/${locale}/catalog?${s}` : `/${locale}/catalog`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "catalog_title") },
        ]}
      />
      <div className="mb-10">
        <p className="section-label">{t(locale, "catalog_browse")}</p>
        <h1 className="mt-2 display-lg text-ink">{t(locale, "catalog_title")}</h1>
        <p className="mt-2 text-sm text-muted">
          {total} {resultsLabel(locale, total)} · {t(locale, "price_on_request")}
        </p>
        <CatalogDownloadLink locale={locale} variant="banner" className="mt-5" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <CatalogFilters
          locale={locale}
          categories={filterCats}
          manufacturers={manufacturers.map((m) => ({
            slug: m.slug,
            name: m.name,
          }))}
          current={{
            category: undefined,
            manufacturer: sp.manufacturer,
            sort: sp.sort,
            q: sp.q,
          }}
          directoryMode={!listing}
        />

        <div className="min-w-0 flex-1">
          {!sp.q && (
            <CatalogShowcase
              locale={locale}
              heading={
                locale === "ru" ? "Разделы каталога" : "Catalog sections"
              }
              items={liveTree.map((c) => ({
                slug: c.slug,
                nameRu: c.nameRu,
                nameEn: c.nameEn,
                image: c.image,
                count: c.count,
                children: c.children
                  .filter((ch) => ch.count > 0 || Boolean(ch.image))
                  .map((ch) => ({
                    slug: ch.slug,
                    nameRu: ch.nameRu,
                    nameEn: ch.nameEn,
                    image: ch.image,
                    count: ch.count,
                  })),
              }))}
            />
          )}

          {listing ? (
            <>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
                {sp.q
                  ? locale === "ru"
                    ? "Результаты поиска"
                    : "Search results"
                  : locale === "ru"
                    ? "Товары"
                    : "Products"}
              </h2>
              {products.length === 0 ? (
                <div className="border border-dashed border-slate-300 py-20 text-center text-slate-500">
                  {t(locale, "catalog_empty")}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} locale={locale} product={p} />
                  ))}
                </div>
              )}
              <CatalogPagination page={page} pages={pages} hrefFor={hrefFor} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
