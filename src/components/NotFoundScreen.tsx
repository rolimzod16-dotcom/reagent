"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NotFoundScreen() {
  const pathname = usePathname() || "/ru";
  const locale =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ru";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-green">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
        {locale === "ru" ? "Страница не найдена" : "Page not found"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {locale === "ru"
          ? "Такой страницы нет. Откройте каталог или вернитесь на главную."
          : "This page does not exist. Open the catalog or go back home."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className="btn btn-primary">
          {locale === "ru" ? "На главную" : "Home"}
        </Link>
        <Link href={`/${locale}/catalog`} className="btn btn-outline">
          {locale === "ru" ? "Каталог" : "Catalog"}
        </Link>
        <Link href={`/${locale}/contact`} className="btn btn-outline">
          {locale === "ru" ? "Контакты" : "Contact"}
        </Link>
      </div>
    </div>
  );
}
