"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "reagent_admin_key";

export function useAdminKey() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState("");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const k =
      typeof window !== "undefined"
        ? sessionStorage.getItem(KEY) || ""
        : "";
    if (k) {
      setAdminKey(k);
      setUnlocked(true);
    }
    setBooting(false);
  }, []);

  function unlock(key?: string) {
    const k = (key ?? adminKey).trim();
    if (k.length < 16) {
      setErr("ADMIN_KEY минимум 16 символов (из Vercel env)");
      return false;
    }
    sessionStorage.setItem(KEY, k);
    setAdminKey(k);
    setUnlocked(true);
    setErr("");
    return true;
  }

  function lock() {
    sessionStorage.removeItem(KEY);
    setAdminKey("");
    setUnlocked(false);
  }

  function headers(json = true): HeadersInit {
    const h: Record<string, string> = { "x-admin-key": adminKey };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  return {
    adminKey,
    setAdminKey,
    unlocked,
    booting,
    err,
    setErr,
    unlock,
    lock,
    headers,
  };
}

const TABS = [
  { href: "/admin", tab: "inquiries", label: "Заявки" },
  { href: "/admin/products", tab: "products", label: "Каталог" },
  { href: "/admin/categories", tab: "categories", label: "Категории" },
  { href: "/admin/brands", tab: "brands", label: "Производители" },
  { href: "/admin/articles", tab: "articles", label: "Статьи" },
  { href: "/admin/solutions", tab: "solutions", label: "Решения" },
  { href: "/admin/about", tab: "about", label: "О компании" },
  { href: "/admin/contacts", tab: "contacts", label: "Реквизиты" },
] as const;

export type AdminTab = (typeof TABS)[number]["tab"];

export function AdminShell({
  title,
  tab,
  children,
  gate,
}: {
  title: string;
  tab: AdminTab;
  children: React.ReactNode;
  gate: ReturnType<typeof useAdminKey>;
}) {
  if (gate.booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        …
      </div>
    );
  }

  if (!gate.unlocked) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src="/brand/flask.png" alt="" className="h-9 w-9 object-contain" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                  РЕАГЕНТ Admin
                </p>
                <h1 className="text-lg font-extrabold text-slate-900">Вход</h1>
              </div>
            </div>
            <Link href="/ru" className="text-sm font-semibold text-green-700">
              ← Сайт
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Введите <code className="text-xs">ADMIN_KEY</code> из Vercel
              (мин. 16 символов).
            </p>
            <input
              type="password"
              value={gate.adminKey}
              onChange={(e) => gate.setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && gate.unlock()}
              placeholder="ADMIN_KEY"
              autoComplete="off"
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            {gate.err && (
              <p className="mt-2 text-sm text-red-600">{gate.err}</p>
            )}
            <button
              type="button"
              onClick={() => gate.unlock()}
              className="mt-4 w-full rounded-xl bg-green-700 py-2.5 text-sm font-bold text-white hover:bg-green-800"
            >
              Войти
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/brand/flask.png" alt="" className="h-9 w-9 object-contain" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                  РЕАГЕНТ Admin
                </p>
                <h1 className="text-lg font-extrabold text-slate-900">{title}</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex max-w-full flex-wrap overflow-hidden rounded-xl border border-slate-200 text-xs font-bold">
              {TABS.map((item) => (
                <Link
                  key={item.tab}
                  href={item.href}
                  className={`px-3 py-2 ${
                    tab === item.tab
                      ? "bg-green-700 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={gate.lock}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600"
            >
              Выйти
            </button>
            <Link
              href="/ru"
              className="text-sm font-semibold text-green-700 hover:underline"
            >
              ← Сайт
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
