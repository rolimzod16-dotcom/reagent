"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Locale, t } from "@/lib/i18n";
import { addToQuoteCart } from "@/lib/quote-cart";

export function AddToCartButton({
  locale,
  productId,
  productName,
  productSku,
  imageUrl,
  slug,
  compact,
  className,
}: {
  locale: Locale;
  productId: string;
  productName: string;
  productSku?: string;
  imageUrl?: string;
  slug?: string;
  compact?: boolean;
  className?: string;
}) {
  const [added, setAdded] = useState(false);

  function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToQuoteCart({
      productId,
      productName,
      sku: productSku,
      imageUrl,
      slug,
      qty: "1",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={
        className ||
        (compact
          ? "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-green bg-white py-2.5 text-xs font-bold text-green transition hover:bg-green-soft"
          : "btn btn-outline inline-flex items-center gap-2")
      }
    >
      {added ? (
        <>
          <Check className="h-4 w-4" />
          {t(locale, "cart_added")}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {t(locale, "cart_add")}
        </>
      )}
    </button>
  );
}
