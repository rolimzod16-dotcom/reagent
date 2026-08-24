import Link from "next/link";
import Image from "next/image";
import { getHomePagePayload } from "@/lib/catalog-queries";
import { getLocale, isLocale, t, resultsLabel } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { CatalogShowcase } from "@/components/CatalogShowcase";
import { QuoteButton } from "@/components/QuoteButton";
import { JsonLd } from "@/components/JsonLd";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_DOMAIN, SITE_GEO } from "@/lib/site";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  Headphones,
  BadgeCheck,
  Search,
  ChevronRight,
  Wrench,
  FlaskConical,
  Package,
} from "lucide-react";

export const revalidate = 120;
export const maxDuration = 30;

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
    path: "",
    title:
      locale === "ru"
        ? `РЕАГЕНТ — медтехника и реагенты в Таджикистане | ${SITE_DOMAIN}`
        : `REAGENT — medical equipment & reagents in Tajikistan | ${SITE_DOMAIN}`,
    description:
      locale === "ru"
        ? `Поставка медицинского оборудования, лабораторных реагентов (ПЦР, ИФА, биохимия) и расходников в Таджикистане. ${SITE_GEO.cityRu} и регионы. B2B, цена по запросу. ${SITE_DOMAIN}`
        : `Medical equipment, lab reagents (PCR, ELISA, chemistry) and consumables in Tajikistan. ${SITE_GEO.cityEn} and regions. B2B, price on request. ${SITE_DOMAIN}`,
    keywords:
      locale === "ru"
        ? [
            "медицинское оборудование Душанбе",
            "реагенты Таджикистан",
            "ПЦР наборы Душанбе",
          ]
        : ["medical equipment Dushanbe", "reagents Tajikistan"],
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });

  const { pillarStats, featured, manufacturers, productCount } =
    await getHomePagePayload();

  // Prefer EHBT-50 Mini Lab as homepage hero when present
  const heroProduct =
    featured.find((p) => p.slug === "ehbt-50-minilab") || featured[0];
  const heroImg =
    heroProduct?.images[0]?.url ||
    (heroProduct?.slug === "ehbt-50-minilab"
      ? "/products/ehbt-50-minilab.jpg"
      : undefined);



  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <section className="relative overflow-hidden hero-green text-white">
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-green-light">
              <span className="h-1.5 w-1.5 rounded-full bg-green-light" />
              {locale === "ru"
                ? "Оборудование · Расходники · Реагенты"
                : "Equipment · Consumables · Reagents"}
            </div>

            <h1 className="mt-5 display-xl text-white">
              {locale === "ru" ? (
                <>
                  Всё для клиники
                  <span className="block text-green-light">
                    и лаборатории
                  </span>
                </>
              ) : (
                <>
                  Everything for clinics
                  <span className="block text-green-light">
                    &amp; laboratories
                  </span>
                </>
              )}
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
              {locale === "ru"
                ? "РЕАГЕНТ — B2B-поставщик медоборудования, расходных материалов и лабораторных реагентов. Цены только по запросу."
                : "REAGENT — B2B supplier of medical equipment, consumables and laboratory reagents. Prices on request only."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}/catalog`} className="btn btn-mint">
                {t(locale, "cta_catalog")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={`/${locale}/contact`} className="btn btn-ghost-light">
                {t(locale, "cta_consult")}
              </Link>
            </div>

            <form
              action={`/${locale}/search`}
              className="mt-7 flex max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  placeholder={t(locale, "search_placeholder")}
                  className="w-full bg-transparent py-3.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="bg-green px-5 text-sm font-bold text-white hover:bg-green-deep"
              >
                {t(locale, "search_button")}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-2xl font-extrabold">{productCount}+</div>
                <div className="text-white/50">
                  {resultsLabel(locale, productCount)}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-green-light">
                  {pillarStats.length}
                </div>
                <div className="text-white/50">
                  {t(locale, "catalog_categories_count")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">B2B</div>
                <div className="text-white/50">
                  {t(locale, "price_on_request")}
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="mb-3 text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-light">
                {locale === "ru"
                  ? "Флагман лаборатории"
                  : "Lab flagship device"}
              </p>
              <h2 className="mt-1 text-xl font-extrabold leading-snug text-white sm:text-2xl">
                {locale === "ru"
                  ? "EHBT-50 Mini Lab — многофункциональный анализатор"
                  : "EHBT-50 Mini Lab — multifunctional analyzer"}
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {locale === "ru"
                  ? "Гематология 7-diff · иммунохимия · биохимия — мини-лаборатория в одном аппарате"
                  : "7-diff hematology · immunoassay · biochemistry — a mini lab in one device"}
              </p>
            </div>
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl sm:aspect-[4/3]">
              <Image
                src={heroImg || "/products/ehbt-50-minilab.jpg"}
                alt={
                  locale === "ru"
                    ? "EHBT-50 Mini Lab — многофункциональный анализатор"
                    : "EHBT-50 Mini Lab — multifunctional analyzer"
                }
                fill
                priority
                className="object-contain bg-white p-3 sm:p-5"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-green-deep/95 via-green-deep/55 to-transparent p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold">
                    {t(locale, "price_on_request")}
                  </span>
                  <Link
                    href={`/${locale}/product/ehbt-50-minilab`}
                    className="text-xs font-bold text-green-light hover:underline"
                  >
                    {t(locale, "read_more")} →
                  </Link>
                  <Link
                    href={`/${locale}/product/ehbt-50-minilab?quote=1#quote-form`}
                    className="text-xs font-bold text-white hover:underline"
                  >
                    {locale === "ru" ? "Запросить цену" : "Request a quote"} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY TREE */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">{t(locale, "home_categories")}</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {t(locale, "catalog_browse")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {productCount}+ {t(locale, "catalog_results")} ·{" "}
                {t(locale, "price_on_request")}
              </p>
            </div>
            <Link
              href={`/${locale}/catalog`}
              className="inline-flex items-center gap-1 text-sm font-bold text-green"
            >
              {t(locale, "view_all")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <CatalogShowcase
            locale={locale}
            compact
            items={pillarStats
              .filter((p) => p.totalProducts > 0 || Boolean(p.image))
              .map((p) => ({
                slug: p.slug,
                nameRu: p.nameRu,
                nameEn: p.nameEn,
                image: p.image,
                count: p.totalProducts,
                children: (p.children || [])
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
        </div>
      </section>

      {/* Advantages */}
      <section className="border-b border-line bg-bg-soft">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            {
              icon: Truck,
              t: locale === "ru" ? "B2B-поставки" : "B2B supply",
              d:
                locale === "ru"
                  ? "Клиники, лаборатории, дистрибьюторы"
                  : "Clinics, labs, distributors",
            },
            {
              icon: Wrench,
              t: locale === "ru" ? "Сервис" : "Service",
              d:
                locale === "ru"
                  ? "Подбор и сопровождение"
                  : "Selection & support",
            },
            {
              icon: FlaskConical,
              t: locale === "ru" ? "Реагенты + техника" : "Reagents + devices",
              d:
                locale === "ru"
                  ? "Комплекс для лаборатории"
                  : "Full lab stack",
            },
            {
              icon: BadgeCheck,
              t: t(locale, "price_on_request"),
              d: `${productCount}+ SKU`,
            },
          ].map(({ icon: Icon, t: title, d }) => (
            <div key={title} className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-green shadow-sm ring-1 ring-line">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="border-y border-line bg-white py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">{t(locale, "home_featured")}</p>
              <h2 className="mt-2 display-lg text-ink">
                {locale === "ru" ? "Популярные позиции" : "Popular products"}
              </h2>
            </div>
            <Link href={`/${locale}/catalog`} className="text-sm font-bold text-green">
              {t(locale, "view_all")} →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} locale={locale} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <p className="section-label">{t(locale, "home_why")}</p>
          <h2 className="mt-2 display-lg text-ink">
            {locale === "ru" ? "Почему РЕАГЕНТ" : "Why REAGENT"}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, k: "home_why_1_t", d: "home_why_1_d" },
            { icon: Headphones, k: "home_why_2_t", d: "home_why_2_d" },
            { icon: BadgeCheck, k: "home_why_3_t", d: "home_why_3_d" },
          ].map(({ icon: Icon, k, d }) => (
            <div
              key={k}
              className="rounded-2xl border border-line bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-soft text-green">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">{t(locale, k)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(locale, d)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Brands */}
      <section className="border-t border-line bg-bg-soft py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="section-label">{t(locale, "home_brands")}</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">
                {locale === "ru" ? "Бренды и партнёры" : "Brands & partners"}
              </h2>
            </div>
            <Link href={`/${locale}/brands`} className="text-sm font-bold text-green">
              {t(locale, "view_all")} →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {manufacturers.map((m) => (
              <Link
                key={m.id}
                href={`/${locale}/brands/${m.slug}`}
                className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 transition hover:border-green/30"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">{m.name}</h3>
                  <p className="text-xs text-muted">
                    {m._count.products} {t(locale, "brands_products")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Geo SEO content — Tajikistan */}
      <section className="border-t border-line bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
            {locale === "ru"
              ? "Медицинское оборудование и реагенты в Таджикистане"
              : "Medical equipment and reagents in Tajikistan"}
          </h2>
          {locale === "ru" ? (
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <p>
                <strong className="text-ink">РЕАГЕНТ (reagent.tj)</strong> —
                B2B-поставщик для клиник, лабораторий и дистрибьюторов в{" "}
                <strong className="text-ink">Таджикистане</strong>. Работаем с
                заказчиками в <strong className="text-ink">Душанбе</strong>,
                Худжанде, Бохтаре, Кулябе и других регионах.
              </p>
              <p>
                В каталоге — медоборудование, расходные материалы и лабораторные
                реагенты: ПЦР, иммунохимия / ИФА, клиническая биохимия, гемостаз.
                Цены не публикуем в открытом доступе — подготовьте заявку, и
                коммерческое предложение придёт под ваш объём и условия поставки.
              </p>
              <p>
                Нужна поставка реагентов или оборудования в Таджикистан?{" "}
                <Link
                  href={`/${locale}/catalog`}
                  className="font-semibold text-green hover:underline"
                >
                  Откройте каталог
                </Link>{" "}
                или{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="font-semibold text-green hover:underline"
                >
                  оставьте запрос
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <p>
                <strong className="text-ink">REAGENT (reagent.tj)</strong> is a
                B2B supplier for clinics, labs and distributors in{" "}
                <strong className="text-ink">Tajikistan</strong> — Dushanbe,
                Khujand, Bokhtar, Kulob and other regions.
              </p>
              <p>
                Catalog covers medical equipment, consumables and laboratory
                reagents: PCR, immunochemistry / ELISA, clinical chemistry,
                hemostasis. Prices on request for your volume and delivery terms.
              </p>
              <p>
                Need supply in Tajikistan?{" "}
                <Link
                  href={`/${locale}/catalog`}
                  className="font-semibold text-green hover:underline"
                >
                  Browse the catalog
                </Link>{" "}
                or{" "}
                <Link
                  href={`/${locale}/contact`}
                  className="font-semibold text-green hover:underline"
                >
                  send a request
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:py-14">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl hero-green px-8 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              {t(locale, "cta_consult")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/65">
              {t(locale, "contact_sub")}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${locale}/catalog`} className="btn btn-mint">
                {t(locale, "cta_catalog")}
              </Link>
              <QuoteButton locale={locale} />
              <Link href={`/${locale}/contact`} className="btn btn-ghost-light">
                {t(locale, "cta_consult")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
