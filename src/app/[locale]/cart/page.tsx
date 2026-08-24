"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  Package,
  LogIn,
} from "lucide-react";
import { getLocale, isLocale, t } from "@/lib/i18n";
import {
  QuoteCartItem,
  clearQuoteCart,
  loadQuoteCart,
  removeFromQuoteCart,
  updateCartQty,
} from "@/lib/quote-cart";
import { InquiryForm } from "@/components/InquiryForm";

type Profile = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  city?: string | null;
};

export default function CartPage() {
  const params = useParams();
  const raw = String(params.locale || "ru");
  const locale = isLocale(raw) ? getLocale({ locale: raw }) : "ru";
  const router = useRouter();

  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authHint, setAuthHint] = useState(false);

  function refresh() {
    setItems(loadQuoteCart());
  }

  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener("reagent-cart-change", sync);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
    return () => window.removeEventListener("reagent-cart-change", sync);
  }, []);

  function changeQty(i: number, delta: number) {
    const cur = Math.max(1, Number(items[i]?.qty || 1) + delta);
    setItems(updateCartQty(i, String(cur)));
  }

  function goRegister() {
    router.push(
      `/${locale}/register?next=${encodeURIComponent(`/${locale}/cart`)}`
    );
  }

  function goLogin() {
    router.push(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/cart`)}`
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="section-label">{t(locale, "nav_cart")}</p>
      <h1 className="display-lg mt-1 text-ink">{t(locale, "cart_title")}</h1>
      <p className="mt-2 text-sm text-muted">{t(locale, "cart_sub")}</p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-bg-soft px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-ink">{t(locale, "cart_empty")}</p>
          <p className="mt-1 text-sm text-muted">{t(locale, "cart_empty_hint")}</p>
          <Link
            href={`/${locale}/catalog`}
            className="btn btn-primary mt-5 inline-flex"
          >
            {t(locale, "cta_catalog")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {items.map((item, i) => (
              <li
                key={`${item.productId || item.productName}-${i}`}
                className="flex gap-3 rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-bg-soft">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg font-bold text-slate-300">
                      R
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.slug ? (
                    <Link
                      href={`/${locale}/product/${item.slug}`}
                      className="text-sm font-bold text-ink hover:text-green"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="text-sm font-bold text-ink">{item.productName}</p>
                  )}
                  {item.sku && (
                    <p className="mt-0.5 font-mono text-[11px] text-green">
                      {item.sku}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center overflow-hidden rounded-lg border border-line">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50"
                        onClick={() => changeQty(i, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        value={item.qty}
                        onChange={(e) =>
                          setItems(
                            updateCartQty(
                              i,
                              e.target.value.replace(/[^\d]/g, "") || "1"
                            )
                          )
                        }
                        className="w-12 border-x border-line py-1.5 text-center text-sm font-bold outline-none"
                      />
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50"
                        onClick={() => changeQty(i, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems(removeFromQuoteCart(i))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t(locale, "cart_remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => {
                clearQuoteCart();
                setItems([]);
              }}
              className="text-sm font-semibold text-muted hover:text-red-500"
            >
              {t(locale, "cart_clear")}
            </button>
            <p className="text-sm text-muted">
              {t(locale, "cart_positions")}:{" "}
              <strong className="text-ink">{items.length}</strong>
            </p>
          </div>

          {/* Auth gate for cart checkout */}
          <div className="mt-6 rounded-2xl border border-line bg-bg-soft p-5">
            <h2 className="text-base font-extrabold text-ink">
              {t(locale, "cart_checkout_title")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "cart_checkout_require_auth")}
            </p>

            {!authChecked ? (
              <p className="mt-4 text-sm text-muted">…</p>
            ) : user ? (
              <div className="mt-4">
                <InquiryForm
                  locale={locale}
                  mode="cart"
                  requireAuth
                  compact
                  onSuccess={() => refresh()}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    authHint
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  {t(locale, "cart_auth_required")}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={goRegister}
                    className="btn btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    {t(locale, "auth_register_btn")}
                  </button>
                  <button
                    type="button"
                    onClick={goLogin}
                    className="btn btn-outline inline-flex items-center justify-center gap-2"
                  >
                    {t(locale, "auth_login_btn")}
                  </button>
                </div>
                <p className="text-xs text-muted">
                  {t(locale, "cart_guest_alt")}{" "}
                  <Link
                    href={`/${locale}/contact`}
                    className="font-semibold text-green hover:underline"
                  >
                    {t(locale, "cart_guest_link")}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
