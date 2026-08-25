import { getLocale, isLocale, t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InquiryForm } from "@/components/InquiryForm";
import {
  SITE_DOMAIN,
  SITE_LEGAL,
  legalLine,
  phoneHref,
  isPlaceholderPhone,
} from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const settings = await getSiteSettings();
  return buildPageMetadata({
    locale,
    path: "/contact",
    title:
      locale === "ru"
        ? `Контакты РЕАГЕНТ — Душанбе, Таджикистан | ${SITE_DOMAIN}`
        : `Contact REAGENT — Dushanbe, Tajikistan | ${SITE_DOMAIN}`,
    description:
      locale === "ru"
        ? `Связаться с РЕАГЕНТ (reagent.tj): поставка медтехники и реагентов в Таджикистане. Email ${settings.email}. Заявка на сайте.`
        : `Contact REAGENT (reagent.tj): medical equipment and reagents in Tajikistan. Email ${settings.email}.`,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const settings = await getSiteSettings();
  const address = locale === "ru" ? settings.addressRu : settings.addressEn;
  const hours = locale === "ru" ? settings.hoursRu : settings.hoursEn;
  const note = locale === "ru" ? settings.noteRu : settings.noteEn;
  const placeholder = isPlaceholderPhone(settings.phone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "contact_title") },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">
        {t(locale, "contact_title")}
      </h1>
      <p className="mt-3 text-sm text-slate-600">{t(locale, "contact_sub")}</p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-900">
          {locale === "ru" ? SITE_LEGAL.brandRu : SITE_LEGAL.brandEn}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {legalLine(locale, settings)}
        </p>
        <p className="mt-3 text-sm text-slate-700">
          Email:{" "}
          <a
            href={`mailto:${settings.email}`}
            className="font-medium text-brand-700"
          >
            {settings.email}
          </a>
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {locale === "ru" ? "Телефон" : "Phone"}:{" "}
          <a
            href={`tel:${phoneHref(settings.phone)}`}
            className="font-medium text-brand-700"
          >
            {settings.phone}
          </a>
          {placeholder && (
            <span className="ml-2 text-xs text-slate-400">
              {locale === "ru" ? "(скоро обновим)" : "(coming soon)"}
            </span>
          )}
        </p>
        {settings.phone2?.trim() ? (
          <p className="mt-2 text-sm text-slate-700">
            {locale === "ru" ? "Телефон 2" : "Phone 2"}:{" "}
            <a
              href={`tel:${phoneHref(settings.phone2)}`}
              className="font-medium text-brand-700"
            >
              {settings.phone2}
            </a>
          </p>
        ) : null}
        {address && (
          <p className="mt-2 text-sm text-slate-700">
            {locale === "ru" ? "Адрес" : "Address"}: {address}
          </p>
        )}
        {hours && (
          <p className="mt-2 text-sm text-slate-700">
            {locale === "ru" ? "Часы работы" : "Hours"}: {hours}
          </p>
        )}
        {note && <p className="mt-2 text-sm text-slate-600">{note}</p>}
        <p className="mt-2 text-xs text-slate-500">{SITE_DOMAIN}</p>
      </div>

      <div id="quote-form" className="mt-10 scroll-mt-24">
        <InquiryForm locale={locale} mode="guest" />
      </div>
    </div>
  );
}
