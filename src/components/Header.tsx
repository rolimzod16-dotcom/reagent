"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Search, Phone, Mail, UserRound } from "lucide-react";
import { Locale, t } from "@/lib/i18n";
import { SITE_EMAIL, SITE_PHONE, phoneHref } from "@/lib/site";
import { CartButton } from "./CartButton";
import { BrandLogo } from "./BrandLogo";

const navKeys = [
  { href: "catalog", key: "nav_catalog" },
  { href: "brands", key: "nav_brands" },
  { href: "solutions", key: "nav_solutions" },
  { href: "articles", key: "nav_articles" },
  { href: "about", key: "nav_about" },
  { href: "contact", key: "nav_contact" },
] as const;

export function Header({
  locale,
  phone,
  phone2,
  email,
}: {
  locale: Locale;
  phone?: string;
  phone2?: string;
  email?: string;
}) {
  const displayPhone = phone || SITE_PHONE;
  const displayEmail = email || SITE_EMAIL;
  const tel = phoneHref(displayPhone);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [authed, setAuthed] = useState(false);

  // Once per mount — not on every navigation (was hammering /api/auth/me)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAuthed(!!d.user);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function switchLocale(next: Locale) {
    const parts = pathname.split("/");
    parts[1] = next;
    router.push(parts.join("/") || `/${next}`);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(
      query
        ? `/${locale}/search?q=${encodeURIComponent(query)}`
        : `/${locale}/catalog`
    );
    setOpen(false);
  }

  const isActive = (href: string) =>
    pathname === `/${locale}/${href}` ||
    pathname.startsWith(`/${locale}/${href}/`);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar — like medtech contact strip */}
      <div className="hidden border-b border-green-deep/20 bg-green-deep text-white sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-4 text-white/85">
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-1.5 transition hover:text-green-light"
            >
              <Phone className="h-3 w-3 text-green-light" />
              {displayPhone}
            </a>
            {phone2?.trim() ? (
              <a
                href={`tel:${phoneHref(phone2)}`}
                className="inline-flex items-center gap-1.5 transition hover:text-green-light"
              >
                <Phone className="h-3 w-3 text-green-light" />
                {phone2}
              </a>
            ) : null}
            <a
              href={`mailto:${displayEmail}`}
              className="inline-flex items-center gap-1.5 transition hover:text-green-light"
            >
              <Mail className="h-3 w-3 text-green-light" />
              {displayEmail}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-white/50 md:inline">
              {locale === "ru"
                ? "B2B · Цена по запросу"
                : "B2B · Price on request"}
            </span>
            <div className="flex overflow-hidden rounded border border-white/15 text-[10px] font-bold">
              {(["ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => switchLocale(l)}
                  className={`px-2.5 py-1 uppercase transition ${
                    locale === l
                      ? "bg-green-light text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-[4.75rem]">
          <Link href={`/${locale}`} className="flex shrink-0 items-center">
            <BrandLogo locale={locale} priority />
          </Link>

          <nav className="ml-6 hidden items-center gap-0.5 lg:flex">
            {navKeys.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}/${item.href}`}
                className={`rounded-md px-3 py-2 text-[13px] font-semibold transition ${
                  isActive(item.href)
                    ? "bg-green-soft text-green"
                    : "text-slate-600 hover:bg-slate-50 hover:text-green"
                }`}
              >
                {t(locale, item.key)}
              </Link>
            ))}
          </nav>

          <form
            onSubmit={onSearch}
            className="ml-auto hidden min-w-0 max-w-xs flex-1 md:block"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t(locale, "search_placeholder")}
                className="w-full rounded-lg border border-line bg-bg-soft py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-green focus:bg-white focus:ring-2 focus:ring-green/15"
              />
            </div>
          </form>

          <div className="hidden sm:block">
            <CartButton locale={locale} />
          </div>

          <Link
            href={authed ? `/${locale}/account` : `/${locale}/login`}
            className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-green hover:text-green sm:inline-flex"
            title={authed ? t(locale, "nav_account") : t(locale, "nav_login")}
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden lg:inline">
              {authed ? t(locale, "nav_account") : t(locale, "nav_login")}
            </span>
          </Link>

          <Link
            href={`/${locale}/contact`}
            className="btn btn-solid hidden !py-2.5 !text-xs sm:inline-flex"
          >
            {t(locale, "cta_consult")}
          </Link>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t(locale, "mobile_menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-b border-line bg-white px-4 py-4 lg:hidden">
          <form onSubmit={onSearch} className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(locale, "search_placeholder")}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-green"
            />
          </form>
          <div className="flex flex-col">
            {navKeys.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}/${item.href}`}
                onClick={() => setOpen(false)}
                className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-700"
              >
                {t(locale, item.key)}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => switchLocale("ru")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${locale === "ru" ? "bg-green text-white" : "bg-slate-100"}`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => switchLocale("en")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${locale === "en" ? "bg-green text-white" : "bg-slate-100"}`}
              >
                EN
              </button>
            </div>
            <Link
              href={`/${locale}/cart`}
              onClick={() => setOpen(false)}
              className="mt-2 border-b border-slate-100 py-3 text-sm font-semibold text-slate-700"
            >
              {t(locale, "nav_cart")}
            </Link>
            <Link
              href={authed ? `/${locale}/account` : `/${locale}/login`}
              onClick={() => setOpen(false)}
              className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-700"
            >
              {authed ? t(locale, "nav_account") : t(locale, "nav_login")}
            </Link>
            {!authed && (
              <Link
                href={`/${locale}/register`}
                onClick={() => setOpen(false)}
                className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-700"
              >
                {t(locale, "nav_register")}
              </Link>
            )}
            <Link
              href={`/${locale}/contact`}
              onClick={() => setOpen(false)}
              className="btn btn-solid mt-3 w-full"
            >
              {t(locale, "cta_consult")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
