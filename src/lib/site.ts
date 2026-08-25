/** Canonical public site config for SEO and absolute URLs */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.reagent.tj"
)
  .replace(/\/$/, "")
  // Live site is www; apex 308s. Sitemap/canonicals must be the final host.
  .replace(/^https?:\/\/reagent\.tj$/i, "https://www.reagent.tj")
  .replace(/^https?:\/\/reagent\.tj\//i, "https://www.reagent.tj/");

export const SITE_NAME = "REAGENT";
export const SITE_NAME_RU = "РЕАГЕНТ";
export const SITE_DOMAIN = "reagent.tj";

export const SITE_EMAIL =
  process.env.NEXT_PUBLIC_SITE_EMAIL || "reagenttj@gmail.com";
export const SITE_PHONE =
  process.env.NEXT_PUBLIC_SITE_PHONE || "+992 000 00 00 00";
export const SITE_PHONE_HREF = SITE_PHONE.replace(/[^\d+]/g, "");

export function phoneHref(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function isPlaceholderPhone(phone: string): boolean {
  return /000[\s0]/.test(phone);
}

/**
 * Legal entity behind REAGENT.TJ
 * RU: ООО · TJ: ЧДММ · EN: LLC (CDMM = Latin form of ЧДММ)
 */
export const SITE_LEGAL = {
  nameRu: "ООО «Тиби Хуршед»",
  nameTj: "ЧДММ «Тиби Хуршед»",
  nameEn: "Tibi Khurshed LLC",
  /** Latin abbreviation of ЧДММ */
  shortEn: "CDMM",
  brandRu: "РЕАГЕНТ (reagent.tj)",
  brandEn: "REAGENT (reagent.tj)",
};

/** Catalog partnership (no legal block inside catalog) */
export const CATALOG_PARTNER = {
  name: "Vector-Best",
  nameRu: "Вектор-Бест",
  noteRu:
    "Каталог лабораторных реагентов и наборов формируется совместно с партнёром Vector-Best. Поставка и коммерческие условия — через РЕАГЕНТ (reagent.tj).",
  noteEn:
    "The laboratory reagents and kits catalog is offered in partnership with Vector-Best. Supply and commercial terms are handled by REAGENT (reagent.tj).",
};

/** Geo: Tajikistan / Dushanbe */
export const SITE_GEO = {
  country: "TJ",
  countryNameRu: "Таджикистан",
  countryNameEn: "Tajikistan",
  cityRu: "Душанбе",
  cityEn: "Dushanbe",
  regionRu: "Душанбе и регионы Таджикистана",
  regionEn: "Dushanbe and regions of Tajikistan",
  /** ICBM / geo.position approx Dushanbe */
  lat: 38.5598,
  lng: 68.787,
  areaServed: ["TJ", "Tajikistan", "Dushanbe", "Khujand", "Bokhtar", "Kulob"],
};

export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localePath(locale: string, path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${locale}${p}`;
}

export type LegalOverride = {
  legalNameRu?: string | null;
  legalNameTj?: string | null;
  legalNameEn?: string | null;
  inn?: string | null;
};

export function legalLine(
  locale: "ru" | "en",
  extra?: LegalOverride | null
): string {
  const ru = extra?.legalNameRu?.trim() || SITE_LEGAL.nameRu;
  const tj = extra?.legalNameTj?.trim() || SITE_LEGAL.nameTj;
  const en = extra?.legalNameEn?.trim() || SITE_LEGAL.nameEn;
  const inn = extra?.inn?.trim();
  if (locale === "ru") {
    return inn ? `${ru} · ${tj} · ИНН ${inn}` : `${ru} · ${tj}`;
  }
  return inn ? `${en} (${SITE_LEGAL.shortEn}) · TIN ${inn}` : `${en} (${SITE_LEGAL.shortEn})`;
}
