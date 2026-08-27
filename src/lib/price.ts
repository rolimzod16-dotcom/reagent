import type { Locale } from "@/lib/i18n";

export const PRICE_CURRENCIES = ["USD", "TJS", "EUR", "RUB"] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

export function parsePriceAmount(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export function formatPrice(
  amount: string | null | undefined,
  currency: string | null | undefined,
  locale: Locale
): string | null {
  if (amount == null || String(amount).trim() === "") return null;
  const n = Number(String(amount).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

export type Priced = {
  priceAmount?: string | null;
  priceCurrency?: string | null;
  priceOnRequest?: boolean | null;
};

export function displayPrice(product: Priced, locale: Locale) {
  const formatted = formatPrice(
    product.priceAmount,
    product.priceCurrency,
    locale
  );
  const request = product.priceOnRequest !== false || !formatted;
  if (formatted && product.priceOnRequest === false) {
    return { label: formatted, isRequest: false };
  }
  if (formatted) {
    return {
      label: `${locale === "ru" ? "от" : "from"} ${formatted}`,
      isRequest: true,
    };
  }
  return {
    label: locale === "ru" ? "Цена по запросу" : "Price on request",
    isRequest: true,
  };
}
