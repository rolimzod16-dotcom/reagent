"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import {
  X,
  Minus,
  Plus,
  Trash2,
  Package,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  QuoteCartItem,
  clearQuoteCart,
  loadQuoteCart,
  removeFromQuoteCart,
  updateCartQty,
} from "@/lib/quote-cart";

type Profile = {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  city?: string | null;
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function phoneDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isValidPassword(v: string) {
  return v.length >= 8 && /[A-Za-zА-Яа-я]/.test(v) && /[0-9]/.test(v);
}

/**
 * Quote / cart request form.
 * Guest: single scrollable form (product + contacts + submit).
 * Cart: list from cart + contacts (requires login).
 */
export function InquiryModal({
  locale,
  productId,
  productName,
  productSku,
  mode = "guest",
  requireAuth = false,
  onClose,
}: {
  locale: Locale;
  productId?: string;
  productName?: string;
  productSku?: string;
  mode?: "guest" | "cart";
  requireAuth?: boolean;
  onClose: () => void;
}) {
  const isCart = mode === "cart" || requireAuth;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Lock body scroll while modal open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (isCart) {
      setItems(loadQuoteCart());
    } else if (productName) {
      setItems([
        {
          productId,
          productName,
          sku: productSku,
          qty: "1",
        },
      ]);
    } else {
      // General consultation (contact page) — no product line required
      setItems([]);
    }

    setAuthLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile(d.user);
          setName(d.user.name || "");
          setEmail(d.user.email || "");
          setCompany(d.user.company || "");
          setPhone(d.user.phone || "");
          setCity(d.user.city || "");
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, [productId, productName, productSku, isCart]);

  function setQty(i: number, qty: string) {
    const q = qty.replace(/[^\d]/g, "") || "1";
    if (isCart) {
      setItems(updateCartQty(i, q));
    } else {
      setItems((prev) => {
        const copy = [...prev];
        if (copy[i]) copy[i] = { ...copy[i], qty: q };
        return copy;
      });
    }
  }

  function bumpQty(i: number, delta: number) {
    const cur = Math.max(1, Number(items[i]?.qty || 1) + delta);
    setQty(i, String(cur));
  }

  function validate(): boolean {
    const fe: Record<string, string> = {};
    if (name.trim().length < 2) {
      fe.name = locale === "ru" ? "Укажите имя (мин. 2 символа)" : "Name is required (min 2)";
    }
    if (phoneDigits(phone).length < 5) {
      fe.phone =
        locale === "ru"
          ? "Укажите телефон (мин. 5 цифр)"
          : "Phone required (min 5 digits)";
    }
    if (!isValidEmail(email)) {
      fe.email =
        locale === "ru" ? "Укажите корректный email" : "Valid email required";
    }
    if (isCart && items.length === 0) {
      fe.items =
        locale === "ru" ? "Корзина пуста" : "Cart is empty";
    }
    if (isCart && !profile) {
      fe.auth = t(locale, "cart_auth_required");
    }
    if (!isCart && !profile && createAccount) {
      if (!isValidPassword(password)) {
        fe.password = t(locale, "auth_password_hint");
      }
    }
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) {
      setError(
        locale === "ru"
          ? "Проверьте обязательные поля"
          : "Please check required fields"
      );
      return;
    }
    if (isCart && !profile) {
      setError(t(locale, "cart_auth_required"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          phone: phone.trim(),
          email: email.trim(),
          city: city.trim() || null,
          message: message.trim() || null,
          urgency,
          items: items.length
            ? items.map((i) => ({
                productId: i.productId || null,
                productName: i.productName,
                sku: i.sku || null,
                qty: String(i.qty || "1"),
              }))
            : undefined,
          productId: productId || items[0]?.productId || null,
          productName: productName || items[0]?.productName || null,
          quantity: items.length
            ? items.map((i) => `${i.productName} × ${i.qty}`).join("; ")
            : null,
          locale,
          source: isCart ? "cart" : "guest",
          createAccount: !isCart && !profile && createAccount,
          password:
            !isCart && !profile && createAccount ? password : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t(locale, "inquiry_error"));
        setLoading(false);
        return;
      }
      if (isCart) clearQuoteCart();
      setDone(true);
    } catch {
      setError(t(locale, "inquiry_error"));
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-green-deep/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t(locale, "close")}
      />

      <div
        className="relative z-10 flex max-h-[min(94vh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-mid">
                REAGENT · B2B
              </p>
              <h2
                id="inquiry-modal-title"
                className="text-lg font-extrabold text-green-deep"
              >
                {isCart
                  ? t(locale, "cart_checkout_title")
                  : t(locale, "inquiry_title")}
              </h2>
              {!done && (
                <p className="mt-0.5 text-xs text-muted">
                  {locale === "ru"
                    ? "Заполните поля и нажмите «Отправить»"
                    : "Fill in the fields and submit"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label={t(locale, "close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {done ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-soft text-green">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-base font-bold text-ink">
                {t(locale, "inquiry_success")}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t(locale, "inquiry_success_hint")}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                >
                  {t(locale, "close")}
                </button>
                {profile && (
                  <Link
                    href={`/${locale}/account`}
                    className="btn btn-outline"
                    onClick={onClose}
                  >
                    {t(locale, "nav_account")}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <form id="inquiry-form" onSubmit={onSubmit} className="space-y-5">
              {/* Products */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                  {t(locale, "inquiry_step_items")}
                </h3>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-bg-soft px-4 py-6 text-center">
                    <Package className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-sm text-muted">
                      {isCart
                        ? t(locale, "inquiry_cart_empty")
                        : locale === "ru"
                          ? "Общая заявка (без конкретного товара)"
                          : "General request (no specific product)"}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li
                        key={`${item.productId || item.productName}-${i}`}
                        className="rounded-xl border border-line bg-bg-soft/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-snug text-ink">
                              {item.productName}
                            </p>
                            {item.sku && (
                              <p className="mt-0.5 font-mono text-[11px] text-green">
                                {item.sku}
                              </p>
                            )}
                          </div>
                          {isCart && (
                            <button
                              type="button"
                              onClick={() =>
                                setItems(removeFromQuoteCart(i))
                              }
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
                              aria-label={t(locale, "cart_remove")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted">
                            {t(locale, "inquiry_qty")}
                          </span>
                          <div className="flex items-center overflow-hidden rounded-lg border border-line bg-white">
                            <button
                              type="button"
                              className="px-2.5 py-1.5 hover:bg-slate-50"
                              onClick={() => bumpQty(i, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              value={item.qty}
                              onChange={(e) => setQty(i, e.target.value)}
                              inputMode="numeric"
                              className="w-12 border-x border-line py-1.5 text-center text-sm font-bold outline-none"
                            />
                            <button
                              type="button"
                              className="px-2.5 py-1.5 hover:bg-slate-50"
                              onClick={() => bumpQty(i, 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {fieldErrors.items && (
                  <FieldError text={fieldErrors.items} />
                )}
              </section>

              {/* Contacts */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  {t(locale, "inquiry_step_contact")}
                </h3>

                {authLoading ? (
                  <p className="text-xs text-muted">…</p>
                ) : profile ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-soft/60 px-3 py-2 text-xs text-green-deep">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t(locale, "inquiry_logged_as")}{" "}
                      <strong>{profile.email}</strong>
                    </span>
                  </div>
                ) : isCart ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {t(locale, "cart_auth_required")}{" "}
                    <Link
                      href={`/${locale}/login?next=/${locale}/cart`}
                      className="font-bold underline"
                      onClick={onClose}
                    >
                      {t(locale, "nav_login")}
                    </Link>
                    {" · "}
                    <Link
                      href={`/${locale}/register?next=/${locale}/cart`}
                      className="font-bold underline"
                      onClick={onClose}
                    >
                      {t(locale, "nav_register")}
                    </Link>
                  </div>
                ) : (
                  <p className="rounded-lg bg-bg-soft px-3 py-2 text-xs text-muted">
                    {t(locale, "inquiry_guest_ok")}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={t(locale, "inquiry_name") + " *"}
                    value={name}
                    onChange={setName}
                    error={fieldErrors.name}
                    autoComplete="name"
                    autoFocus
                  />
                  <Field
                    label={t(locale, "inquiry_company")}
                    value={company}
                    onChange={setCompany}
                    autoComplete="organization"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={t(locale, "inquiry_phone") + " *"}
                    value={phone}
                    onChange={setPhone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+992 … / +7 …"
                    error={fieldErrors.phone}
                  />
                  <Field
                    label={t(locale, "inquiry_email") + " *"}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    error={fieldErrors.email}
                  />
                </div>
                <Field
                  label={t(locale, "inquiry_city")}
                  value={city}
                  onChange={setCity}
                  autoComplete="address-level2"
                />

                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-muted">
                    {t(locale, "inquiry_urgency")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["normal", "inquiry_urgency_normal"],
                        ["urgent", "inquiry_urgency_urgent"],
                      ] as const
                    ).map(([val, key]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setUrgency(val)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                          urgency === val
                            ? "border-green bg-green-soft text-green-deep"
                            : "border-line text-slate-600 hover:border-green/40"
                        }`}
                      >
                        {t(locale, key)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">
                    {t(locale, "inquiry_message")}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder={t(locale, "inquiry_message_ph")}
                    className="w-full resize-y rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15"
                  />
                </div>

                {!isCart && !profile && (
                  <div className="rounded-xl border border-line bg-bg-soft p-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={(e) => {
                          setCreateAccount(e.target.checked);
                          if (!e.target.checked) {
                            setPassword("");
                            setFieldErrors((f) => {
                              const n = { ...f };
                              delete n.password;
                              return n;
                            });
                          }
                        }}
                        className="mt-1 h-4 w-4 accent-green"
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink">
                          {t(locale, "inquiry_create_account")}
                        </span>
                        <span className="text-xs text-muted">
                          {t(locale, "inquiry_create_account_hint")}
                        </span>
                      </span>
                    </label>
                    {createAccount && (
                      <div className="mt-3">
                        <Field
                          label={t(locale, "auth_password") + " *"}
                          value={password}
                          onChange={setPassword}
                          type="password"
                          autoComplete="new-password"
                          placeholder={t(locale, "auth_password_hint")}
                          error={fieldErrors.password}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>

              {(error || fieldErrors.auth) && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error || fieldErrors.auth}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Sticky footer actions */}
        {!done && (
          <div className="shrink-0 border-t border-line bg-white px-5 py-4 sm:px-6">
            <button
              type="submit"
              form="inquiry-form"
              disabled={loading || authLoading || (isCart && !profile)}
              className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? locale === "ru"
                  ? "Отправка…"
                  : "Sending…"
                : t(locale, "inquiry_submit")}
            </button>
            {isCart && !profile && !authLoading && (
              <p className="mt-2 text-center text-xs text-muted">
                {t(locale, "cart_auth_required")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  autoComplete,
  autoFocus,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputMode={inputMode}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green/15 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-line focus:border-green"
        }`}
      />
      {error && <FieldError text={error} />}
    </div>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {text}
    </p>
  );
}
