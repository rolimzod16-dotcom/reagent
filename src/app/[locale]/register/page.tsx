"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { getLocale, isLocale, t } from "@/lib/i18n";
import { safeRedirectPath } from "@/lib/safe-path";

function RegisterForm() {
  const params = useParams();
  const raw = String(params.locale || "ru");
  const locale = isLocale(raw) ? getLocale({ locale: raw }) : "ru";
  const router = useRouter();
  const search = useSearchParams();
  const next = safeRedirectPath(
    search.get("next"),
    `/${locale}/account`
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          company,
          phone,
          city,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "Email already registered"
            ? t(locale, "auth_error_exists")
            : data.error || t(locale, "auth_error")
        );
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(t(locale, "auth_error"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-wider text-green-mid">
          REAGENT
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-green-deep">
          {t(locale, "auth_register_title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "auth_register_sub")}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t(locale, "inquiry_name") + " *"}
              value={name}
              onChange={setName}
              required
              autoComplete="name"
            />
            <Field
              label={t(locale, "inquiry_company")}
              value={company}
              onChange={setCompany}
              autoComplete="organization"
            />
          </div>
          <Field
            label={t(locale, "inquiry_email") + " *"}
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <Field
            label={t(locale, "auth_password") + " *"}
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
            hint={t(locale, "auth_password_hint")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t(locale, "inquiry_phone")}
              type="tel"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
            />
            <Field
              label={t(locale, "inquiry_city")}
              value={city}
              onChange={setCity}
              autoComplete="address-level2"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {loading ? "…" : t(locale, "auth_register_btn")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {t(locale, "auth_have_account")}{" "}
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(next)}`}
            className="font-bold text-green hover:underline"
          >
            {t(locale, "auth_login_link")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">…</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
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
        autoComplete={autoComplete}
        required={required}
        minLength={type === "password" ? 8 : undefined}
        className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15"
      />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
