"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Locale, t } from "@/lib/i18n";
import { cartCount, loadQuoteCart } from "@/lib/quote-cart";

export function CartButton({ locale }: { locale: Locale }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(cartCount(loadQuoteCart()));
    sync();
    window.addEventListener("reagent-cart-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("reagent-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link
      href={`/${locale}/cart`}
      className="relative inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-green hover:text-green"
      title={t(locale, "nav_cart")}
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden lg:inline">{t(locale, "nav_cart")}</span>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1 text-[10px] font-extrabold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
