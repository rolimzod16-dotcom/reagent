import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import { Phone, Mail, MapPin } from "lucide-react";
import {
  SITE_DOMAIN,
  SITE_EMAIL,
  SITE_PHONE,
  SITE_URL,
  legalLine,
  phoneHref,
  isPlaceholderPhone,
} from "@/lib/site";
import { BrandLogo } from "./BrandLogo";
import { CatalogDownloadLink } from "./CatalogDownloadLink";

export function Footer({
  locale,
  phone,
  phone2,
  email,
  address,
  legalNameRu,
  legalNameTj,
  legalNameEn,
  inn,
}: {
  locale: Locale;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  legalNameRu?: string;
  legalNameTj?: string;
  legalNameEn?: string;
  inn?: string;
}) {
  const displayPhone = phone || SITE_PHONE;
  const displayEmail = email || SITE_EMAIL;
  const showPhone = Boolean(displayPhone) && !isPlaceholderPhone(displayPhone);
  const showPhone2 = Boolean(phone2?.trim()) && !isPlaceholderPhone(phone2 || "");
  const tel = phoneHref(displayPhone);
  const displayAddress =
    address || (locale === "ru" ? "Душанбе / регионы" : "Dushanbe / regions");
  const legal = legalLine(locale, {
    legalNameRu,
    legalNameTj,
    legalNameEn,
    inn,
  });
  return (
    <footer className="mt-auto bg-green-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo locale={locale} tone="dark" />
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            {t(locale, "tagline")}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-green-light">
            {t(locale, "footer_no_prices")}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-light">
            {locale === "ru" ? "Каталог" : "Catalog"}
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link href={`/${locale}/catalog`} className="hover:text-white">
                {t(locale, "nav_catalog")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/brands`} className="hover:text-white">
                {t(locale, "nav_brands")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/solutions`} className="hover:text-white">
                {t(locale, "nav_solutions")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/documents`} className="hover:text-white">
                {t(locale, "nav_documents")}
              </Link>
            </li>
            <li>
              <CatalogDownloadLink locale={locale} variant="footer" />
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-light">
            {locale === "ru" ? "Компания" : "Company"}
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link href={`/${locale}/about`} className="hover:text-white">
                {t(locale, "nav_about")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/articles`} className="hover:text-white">
                {t(locale, "nav_articles")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/faq`} className="hover:text-white">
                {t(locale, "nav_faq")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/contact`} className="hover:text-white">
                {t(locale, "nav_contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-light">
            {t(locale, "contact_title")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            {showPhone ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
                <a href={`tel:${tel}`} className="hover:text-white">
                  {displayPhone}
                </a>
              </li>
            ) : null}
            {showPhone2 ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
                <a
                  href={`tel:${phoneHref(phone2!)}`}
                  className="hover:text-white"
                >
                  {phone2}
                </a>
              </li>
            ) : null}
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
              <a href={`mailto:${displayEmail}`} className="hover:text-white">
                {displayEmail}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
              {displayAddress}
            </li>
            <li>
              <a
                href={SITE_URL}
                className="font-semibold text-green-light hover:text-white"
              >
                {SITE_DOMAIN}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()}{" "}
            {locale === "ru" ? "РЕАГЕНТ / REAGENT" : "REAGENT"} ·{" "}
            {SITE_DOMAIN}
            <br className="sm:hidden" />
            <span className="sm:before:content-['·_']">
              {legal}
            </span>
            . {t(locale, "footer_rights")}
          </p>
          <div className="flex gap-3">
            <Link href="/ru" className="hover:text-white">
              RU
            </Link>
            <Link href="/en" className="hover:text-white">
              EN
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
