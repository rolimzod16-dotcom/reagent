"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import {
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

/** Full-page / in-card quote form (not a modal). */
export function InquiryForm({
  locale,
  productId,
  productName,
  productSku,
  mode = "guest",
  requireAuth = false,
  compact = false,
  onSuccess,
}: {
  locale: Locale;
  productId?: string;
  productName?: string;
  productSku?: string;
  mode?: "guest" | "cart";
  requireAuth?: boolean;
  /** tighter padding for embedding */
  compact?: boolean;
  onSuccess?: () => void;
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
      fe.name =
        locale === "ru"
          ? "Укажите имя (мин. 2 символа)"
          : "Name is required (min 2)";
    }
    if (phoneDigits(phone).length < 5) {
      fe.phone =
        locale === "ru"
          ? "Укажите телефон (мин. 5 цифр)"
          : "Phone required (min 5 digits)";
    }
    if (!isValidEmail(email)) {
      fe.email =
        locale === "ru"
          ? "Укажите корректный email"
          : "Valid email required";
    }
    if (isCart && items.length === 0) {
      fe.items = locale === "ru" ? "Корзина пуста" : "Cart is empty";
    }
    if (isCart && !profile) {
      fe.auth = t(locale, "cart_auth_required");
    }
    if (!isCart && !profile && createAccount && !isValidPassword(password)) {
      fe.password = t(locale, "auth_password_hint");
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
          ? "Проверьте обязательные поля, отмеченные *"
          : "Please check required fields marked *"
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
      onSuccess?.();
    } catch {
      setError(t(locale, "inquiry_error"));
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div
        className={`rounded-2xl border border-green/20 bg-green-soft/40 text-center ${
          compact ? "p-6" : "p-8 sm:p-10"
        }`}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-green shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="text-lg font-extrabold text-ink">
          {t(locale, "inquiry_success")}
        </p>
        <p className="mt-2 text-sm text-muted">
          {t(locale, "inquiry_success_hint")}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href={`/${locale}/catalog`} className="btn btn-primary">
            {t(locale, "cta_catalog")}
          </Link>
          {profile && (
            <Link href={`/${locale}/account`} className="btn btn-outline">
              {t(locale, "nav_account")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-2xl border border-line bg-white shadow-sm ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-8"
      }`}
    >
      <div className="mb-6 border-b border-line pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-green-mid">
          REAGENT · B2B
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-green-deep sm:text-2xl">
          {isCart
            ? t(locale, "cart_checkout_title")
            : t(locale, "inquiry_title")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {locale === "ru"
            ? "Заполните форму — мы подготовим коммерческое предложение."
            : "Fill in the form — we will prepare a commercial offer."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Items */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
            {t(locale, "inquiry_step_items")}
          </h3>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-soft px-4 py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-muted">
                {isCart
                  ? t(locale, "inquiry_cart_empty")
                  : locale === "ru"
                    ? "Общая заявка (без конкретного товара)"
                    : "General request (no specific product)"}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li
                  key={`${item.productId || item.productName}-${i}`}
                  className="rounded-xl border border-line bg-bg-soft/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-ink sm:text-base">
                        {item.productName}
                      </p>
                      {item.sku && (
                        <p className="mt-1 font-mono text-xs text-green">
                          {item.sku}
                        </p>
                      )}
                    </div>
                    {isCart && (
                      <button
                        type="button"
                        onClick={() => setItems(removeFromQuoteCart(i))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted">
                      {t(locale, "inquiry_qty")}
                    </span>
                    <div className="flex items-center overflow-hidden rounded-lg border border-line bg-white">
                      <button
                        type="button"
                        className="px-3 py-2 hover:bg-slate-50"
                        onClick={() => bumpQty(i, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        value={item.qty}
                        onChange={(e) => setQty(i, e.target.value)}
                        inputMode="numeric"
                        className="w-14 border-x border-line py-2 text-center text-sm font-bold outline-none"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 hover:bg-slate-50"
                        onClick={() => bumpQty(i, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {fieldErrors.items && <FieldError text={fieldErrors.items} />}
        </section>

        {/* Contacts */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t(locale, "inquiry_step_contact")}
          </h3>

          {authLoading ? (
            <p className="text-xs text-muted">…</p>
          ) : profile ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-soft/70 px-3 py-2.5 text-sm text-green-deep">
              <User className="h-4 w-4 shrink-0" />
              <span>
                {t(locale, "inquiry_logged_as")}{" "}
                <strong>{profile.email}</strong>
              </span>
            </div>
          ) : isCart ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              {t(locale, "cart_auth_required")}{" "}
              <Link
                href={`/${locale}/login?next=/${locale}/cart`}
                className="font-bold underline"
              >
                {t(locale, "nav_login")}
              </Link>
              {" · "}
              <Link
                href={`/${locale}/register?next=/${locale}/cart`}
                className="font-bold underline"
              >
                {t(locale, "nav_register")}
              </Link>
            </div>
          ) : (
            <p className="rounded-lg bg-bg-soft px-3 py-2.5 text-sm text-muted">
              {t(locale, "inquiry_guest_ok")}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t(locale, "inquiry_name") + " *"}
              value={name}
              onChange={setName}
              error={fieldErrors.name}
              autoComplete="name"
            />
            <Field
              label={t(locale, "inquiry_company")}
              value={company}
              onChange={setCompany}
              autoComplete="organization"
            />
            <Field
              label={t(locale, "inquiry_phone") + " *"}
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
              placeholder="+992 … / +7 …"
              error={fieldErrors.phone}
            />
            <Field
              label={t(locale, "inquiry_email") + " *"}
              value={email}
              onChange={setEmail}
              type="email"
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
            <span className="mb-2 block text-xs font-semibold text-muted">
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
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
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
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t(locale, "inquiry_message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={t(locale, "inquiry_message_ph")}
              className="w-full resize-y rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15"
            />
          </div>

          {!isCart && !profile && (
            <div className="rounded-xl border border-line bg-bg-soft p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => {
                    setCreateAccount(e.target.checked);
                    if (!e.target.checked) setPassword("");
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
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error || fieldErrors.auth}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || authLoading || (isCart && !profile)}
          className="btn btn-primary w-full !py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? locale === "ru"
              ? "Отправка…"
              : "Sending…"
            : t(locale, "inquiry_submit")}
        </button>
      </div>
    </form>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green/15 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-line focus:border-green"
        }`}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="h-3 w-3" />
      {text}
    </p>
  );
}
