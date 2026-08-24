import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata, organizationJsonLd } from "@/lib/seo";
import {
  SITE_DOMAIN,
  SITE_GEO,
  SITE_LEGAL,
  legalLine,
  CATALOG_PARTNER,
  phoneHref,
  isPlaceholderPhone,
} from "@/lib/site";
import { getCmsPage, getSiteSettings, DEFAULT_ABOUT_RU, DEFAULT_ABOUT_EN } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const page = await getCmsPage("about");
  const title = page
    ? field(locale, page.titleRu, page.titleEn)
    : locale === "ru"
      ? `О компании РЕАГЕНТ — поставки в Таджикистане | ${SITE_DOMAIN}`
      : `About REAGENT — supply in Tajikistan | ${SITE_DOMAIN}`;
  return buildPageMetadata({
    locale,
    path: "/about",
    title,
    description:
      locale === "ru"
        ? `РЕАГЕНТ (reagent.tj) — B2B поставщик медицинского оборудования и лабораторных реагентов в Таджикистане. ${SITE_GEO.cityRu}, регионы.`
        : `REAGENT (reagent.tj) — B2B medical equipment and lab reagents supplier in Tajikistan. ${SITE_GEO.cityEn} and regions.`,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const [page, settings] = await Promise.all([
    getCmsPage("about"),
    getSiteSettings(),
  ]);

  const title = page
    ? field(locale, page.titleRu, page.titleEn)
    : locale === "ru"
      ? "О компании РЕАГЕНТ (reagent.tj)"
      : "About REAGENT (reagent.tj)";
  const body =
    (page ? field(locale, page.bodyRu, page.bodyEn) : "") ||
    (locale === "ru" ? DEFAULT_ABOUT_RU : DEFAULT_ABOUT_EN);
  const placeholder = isPlaceholderPhone(settings.phone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={organizationJsonLd()} />
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "about_title") },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <div className="prose-sm mt-6 space-y-4 leading-relaxed text-slate-600">
        <p className="whitespace-pre-line">{body}</p>
        <p>
          {locale === "ru" ? (
            <>
              Юридическое лицо:{" "}
              <strong className="text-slate-900">{SITE_LEGAL.nameRu}</strong> /{" "}
              {SITE_LEGAL.nameTj}. Каталог лабораторных реагентов формируется
              совместно с партнёром {CATALOG_PARTNER.name}.
            </>
          ) : (
            <>
              Legal entity:{" "}
              <strong className="text-slate-900">{SITE_LEGAL.nameEn}</strong> (
              {SITE_LEGAL.shortEn}). Laboratory reagents catalog is offered in
              partnership with {CATALOG_PARTNER.name}.
            </>
          )}
        </p>
        <h2 className="text-xl font-bold text-slate-900">
          {locale === "ru" ? "Контакты" : "Contact"}
        </h2>
        <p>
          {legalLine(locale)}
          <br />
          Email:{" "}
          <a
            className="font-medium text-green-700"
            href={`mailto:${settings.email}`}
          >
            {settings.email}
          </a>
          <br />
          {locale === "ru" ? "Тел." : "Phone"}:{" "}
          <a
            className="font-medium text-green-700"
            href={`tel:${phoneHref(settings.phone)}`}
          >
            {settings.phone}
          </a>
          {placeholder && (
            <span className="ml-2 text-xs text-slate-400">
              {locale === "ru" ? "(скоро обновим)" : "(coming soon)"}
            </span>
          )}
          <br />
          {locale === "ru" ? "Регион" : "Region"}:{" "}
          {locale === "ru" ? settings.addressRu || SITE_GEO.regionRu : settings.addressEn || SITE_GEO.regionEn}
        </p>
        <p>
          <Link
            href={`/${locale}/catalog`}
            className="font-semibold text-green-700 hover:underline"
          >
            {locale === "ru" ? "Каталог продукции" : "Product catalog"}
          </Link>
          {" · "}
          <Link
            href={`/${locale}/contact`}
            className="font-semibold text-green-700 hover:underline"
          >
            {locale === "ru" ? "Запросить предложение" : "Request a quote"}
          </Link>
        </p>
      </div>
    </div>
  );
}
