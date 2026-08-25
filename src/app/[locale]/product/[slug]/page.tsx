import { getProductPagePayload } from "@/lib/catalog-queries";
import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { QuoteButton } from "@/components/QuoteButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import { InquiryForm } from "@/components/InquiryForm";
import { QuoteFormAnchor } from "@/components/QuoteFormAnchor";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { buildPageMetadata, productJsonLd } from "@/lib/seo";
import { SITE_DOMAIN } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 300;
export const maxDuration = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const data = await getProductPagePayload(slug);
  if (!data) return {};
  const { product } = data;
  const name = field(locale, product.nameRu, product.nameEn);
  const desc =
    field(locale, product.shortRu, product.shortEn) ||
    field(locale, product.descriptionRu, product.descriptionEn);
  const baseDesc = (desc || name).slice(0, 120);
  return buildPageMetadata({
    locale,
    path: `/product/${slug}`,
    title:
      locale === "ru"
        ? `${name} — купить / запрос цены | ${SITE_DOMAIN}`
        : `${name} — quote request | ${SITE_DOMAIN}`,
    description:
      locale === "ru"
        ? `${baseDesc}. Поставка в Таджикистане (Душанбе). ${product.sku ? `Арт. ${product.sku}. ` : ""}Цена по запросу. ${SITE_DOMAIN}`
        : `${baseDesc}. Supply in Tajikistan (Dushanbe). ${product.sku ? `SKU ${product.sku}. ` : ""}Price on request.`,
    keywords: [name, product.sku || "", "Таджикистан", "Душанбе"].filter(
      Boolean
    ),
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });

  const data = await getProductPagePayload(slug);
  if (!data) notFound();
  const { product, related } = data;

  const name = field(locale, product.nameRu, product.nameEn);
  const img = product.images[0];

  const jsonLd = productJsonLd({
    name,
    description: field(locale, product.shortRu, product.shortEn),
    sku: product.sku,
    brand: product.manufacturer?.name,
    image: img?.url,
    path: `/${locale}/product/${product.slug}`,
  });

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd data={jsonLd} />
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { href: `/${locale}/catalog`, label: t(locale, "catalog_title") },
          {
            href: `/${locale}/catalog/${product.category.slug}`,
            label: field(
              locale,
              product.category.nameRu,
              product.category.nameEn
            ),
          },
          { label: name },
        ]}
      />

      <div className="grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-bg-soft shadow-sm">
          {img ? (
            <Image
              src={img.url}
              alt={field(locale, img.altRu, img.altEn) || name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col">
          {product.manufacturer && (
            <Link
              href={`/${locale}/brands/${product.manufacturer.slug}`}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-mid hover:text-green"
            >
              {product.manufacturer.name}
            </Link>
          )}
          <h1 className="break-long mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.sku && (
              <span className="break-long rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-600">
                {t(locale, "product_sku")}: {product.sku}
              </span>
            )}
            {product.model && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-600">
                {t(locale, "product_model")}: {product.model}
              </span>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              {locale === "ru" ? "Стоимость" : "Pricing"}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-green">
              {t(locale, "price_on_request")}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <AddToCartButton
                locale={locale}
                productId={product.id}
                productName={name}
                productSku={product.sku || undefined}
                imageUrl={img?.url}
                slug={product.slug}
              />
              <QuoteButton
                locale={locale}
                productSlug={product.slug}
              />
              <p className="text-[11px] leading-relaxed text-muted">
                {locale === "ru"
                  ? "«Запросить цену» — откроется форма заявки ниже. «В корзину» — несколько позиций (нужен аккаунт)."
                  : "“Request quote” scrolls to the form below. “Add to cart” — multi-item (account required)."}
              </p>
            </div>
          </div>

          {field(locale, product.shortRu, product.shortEn) && (
            <p className="break-long mt-6 text-[15px] leading-relaxed text-muted">
              {field(locale, product.shortRu, product.shortEn)}
            </p>
          )}
        </div>
      </div>

      {/* Full quote form — opens when user clicks "Request quote" */}
      <section
        id="quote-form"
        className="mt-12 scroll-mt-24 rounded-2xl border border-green/15 bg-green-mist/40 p-1 sm:p-2"
      >
        <Suspense fallback={null}>
          <QuoteFormAnchor />
        </Suspense>
        <InquiryForm
          locale={locale}
          productId={product.id}
          productName={name}
          productSku={product.sku || undefined}
          mode="guest"
        />
      </section>

      <div className="mt-14 grid min-w-0 gap-10 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-semibold">
            {t(locale, "product_overview")}
          </h2>
          <p className="break-long whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {field(locale, product.descriptionRu, product.descriptionEn) ||
              "—"}
          </p>

          {field(locale, product.applicationsRu, product.applicationsEn) && (
            <>
              <h2 className="mb-3 mt-10 border-b border-slate-200 pb-2 text-lg font-semibold">
                {t(locale, "product_apps")}
              </h2>
              <p className="break-long text-sm text-slate-600">
                {field(
                  locale,
                  product.applicationsRu,
                  product.applicationsEn
                )}
              </p>
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-8">
          <div className="min-w-0">
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-semibold">
              {t(locale, "product_specs")}
            </h2>
            {product.specifications.length === 0 ? (
              <p className="text-sm text-slate-500">{t(locale, "no_specs")}</p>
            ) : (
              <table className="w-full table-fixed text-sm">
                <tbody>
                  {product.specifications.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <th className="break-long w-[42%] py-2 pr-3 text-left align-top font-medium text-slate-500">
                        {field(locale, s.labelRu, s.labelEn)}
                      </th>
                      <td className="break-long py-2 align-top text-slate-800">
                        {field(locale, s.valueRu, s.valueEn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-semibold">
              {t(locale, "product_docs")}
            </h2>
            {product.documents.length === 0 ? (
              <p className="text-sm text-slate-500">{t(locale, "no_docs")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {product.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {field(locale, d.titleRu, d.titleEn)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            {t(locale, "product_related")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} locale={locale} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
