import type { Metadata } from "next";
import {
  SITE_DOMAIN,
  SITE_EMAIL,
  SITE_GEO,
  SITE_LEGAL,
  SITE_NAME,
  SITE_NAME_RU,
  SITE_PHONE,
  SITE_URL,
  isPlaceholderPhone,
  absoluteUrl,
  localePath,
} from "@/lib/site";
import type { Locale } from "@/lib/i18n";

const GEO_KEYWORDS_RU = [
  "медицинское оборудование Таджикистан",
  "реагенты Душанбе",
  "лабораторные реагенты Таджикистан",
  "ПЦР реагенты Душанбе",
  "медоборудование Душанбе",
  "поставка реагентов Таджикистан",
  "B2B медицина Таджикистан",
  "клиническая лаборатория Душанбе",
  "ИФА наборы Таджикистан",
  "реагент.tj",
  "reagent.tj",
];

const GEO_KEYWORDS_EN = [
  "medical equipment Tajikistan",
  "lab reagents Dushanbe",
  "PCR kits Tajikistan",
  "medical supplies Dushanbe",
  "B2B medical Tajikistan",
  "clinical laboratory Dushanbe",
  "reagent.tj",
];

export function geoKeywords(locale: Locale): string[] {
  return locale === "ru" ? GEO_KEYWORDS_RU : GEO_KEYWORDS_EN;
}

export function buildPageMetadata(opts: {
  locale: Locale;
  title: string;
  description: string;
  path: string; // e.g. "" or "/catalog" or "/product/x"
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const { locale, title, description, path, keywords = [], noIndex } = opts;
  const pathNorm = path === "/" ? "" : path;
  const canonicalPath = localePath(locale, pathNorm);
  const url = absoluteUrl(canonicalPath);

  const languages: Record<string, string> = {
    ru: absoluteUrl(localePath("ru", pathNorm)),
    en: absoluteUrl(localePath("en", pathNorm)),
    "x-default": absoluteUrl(localePath("ru", pathNorm)),
  };

  const allKw = [
    ...keywords,
    ...geoKeywords(locale),
    SITE_DOMAIN,
    SITE_NAME,
    SITE_NAME_RU,
  ];

  return {
    title,
    description,
    keywords: allKw,
    alternates: {
      canonical: url,
      languages,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: locale === "ru" ? "ru_TJ" : "en_TJ",
      url,
      siteName: `${SITE_NAME} · ${SITE_DOMAIN}`,
      title,
      description,
      countryName: SITE_GEO.countryNameEn,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      "geo.region": "TJ",
      "geo.placename":
        locale === "ru" ? SITE_GEO.cityRu : SITE_GEO.cityEn,
      "geo.position": `${SITE_GEO.lat};${SITE_GEO.lng}`,
      ICBM: `${SITE_GEO.lat}, ${SITE_GEO.lng}`,
    },
  };
}

/** Organization + LocalBusiness JSON-LD for Tajikistan */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalBusiness", "LocalBusiness"],
    name: `${SITE_NAME_RU} / ${SITE_NAME}`,
    legalName: SITE_LEGAL.nameRu,
    alternateName: [
      SITE_DOMAIN,
      "reagent.tj",
      "РЕАГЕНТ Таджикистан",
      SITE_LEGAL.nameRu,
      SITE_LEGAL.nameEn,
      SITE_LEGAL.shortEn,
    ],
    url: SITE_URL,
    email: SITE_EMAIL,
    ...(isPlaceholderPhone(SITE_PHONE) ? {} : { telephone: SITE_PHONE }),
    foundingDate: "2024",
    description:
      "B2B-поставщик медицинского оборудования, лабораторных реагентов и расходных материалов в Таджикистане (Душанбе и регионы).",
    areaServed: [
      {
        "@type": "Country",
        name: "Tajikistan",
        sameAs: "https://www.wikidata.org/wiki/Q863",
      },
      { "@type": "City", name: "Dushanbe" },
      { "@type": "City", name: "Khujand" },
      { "@type": "City", name: "Bokhtar" },
      { "@type": "City", name: "Kulob" },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "TJ",
      addressLocality: "Dushanbe",
      addressRegion: "Dushanbe",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_GEO.lat,
      longitude: SITE_GEO.lng,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: SITE_EMAIL,
        ...(isPlaceholderPhone(SITE_PHONE) ? {} : { telephone: SITE_PHONE }),
        areaServed: "TJ",
        availableLanguage: ["Russian", "English", "Tajik"],
      },
    ],
    knowsAbout: [
      "Medical equipment",
      "Laboratory reagents",
      "PCR diagnostics",
      "ELISA kits",
      "Clinical chemistry",
      "Healthcare B2B supply Tajikistan",
    ],
    sameAs: [SITE_URL, `https://www.${SITE_DOMAIN}`],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [SITE_NAME_RU, SITE_DOMAIN],
    url: SITE_URL,
    inLanguage: ["ru", "en"],
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/ru/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function productJsonLd(opts: {
  name: string;
  description?: string | null;
  sku?: string | null;
  brand?: string | null;
  image?: string | null;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description || undefined,
    sku: opts.sku || undefined,
    image: opts.image || undefined,
    brand: opts.brand
      ? { "@type": "Brand", name: opts.brand }
      : { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl(opts.path),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(opts.path),
      availability: "https://schema.org/InStock",
      priceCurrency: "TJS",
      businessFunction: "https://schema.org/Sell",
      areaServed: { "@type": "Country", name: "Tajikistan" },
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "TJS",
        description: "Price on request / Цена по запросу",
      },
    },
  };
}
