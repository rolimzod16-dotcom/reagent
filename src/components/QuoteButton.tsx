"use client";

import Link from "next/link";
import { Locale, t } from "@/lib/i18n";

/**
 * Opens the full product page with the quote form section.
 * If no product slug — goes to contact page form.
 */
export function QuoteButton({
  locale,
  productSlug,
  compact,
}: {
  locale: Locale;
  productId?: string;
  productName?: string;
  productSku?: string;
  productSlug?: string;
  compact?: boolean;
}) {
  const href = productSlug
    ? `/${locale}/product/${productSlug}?quote=1#quote-form`
    : `/${locale}/contact#quote-form`;

  return (
    <Link
      href={href}
      className={
        compact
          ? "flex w-full items-center justify-center rounded-lg bg-green py-2.5 text-xs font-bold text-white transition hover:bg-green-deep"
          : "btn btn-primary inline-flex items-center justify-center"
      }
    >
      {t(locale, "cta_quote")}
    </Link>
  );
}
