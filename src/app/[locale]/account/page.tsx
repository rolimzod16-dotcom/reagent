"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getLocale, isLocale, t } from "@/lib/i18n";
import {
  ORDER_STATUSES,
  parseStatusHistory,
  statusBadgeClass,
  statusProgress,
} from "@/lib/order-status";

type User = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  city: string | null;
  role: string;
};

type Inquiry = {
  id: string;
  productName: string | null;
  quantity: string | null;
  status: string;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  message: string | null;
  city: string | null;
  itemsJson: string | null;
  statusHistory: string | null;
  trackingNumber: string | null;
  notes: string | null;
};

const PIPELINE = [
  "new",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
] as const;

export default function AccountPage() {
  const params = useParams();
  const raw = String(params.locale || "ru");
  const locale = isLocale(raw) ? getLocale({ locale: raw }) : "ru";
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "profile">("orders");
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.replace(`/${locale}/login?next=/${locale}/account`);
        return;
      }
      setUser(me.user);
      setName(me.user.name || "");
      setCompany(me.user.company || "");
      setPhone(me.user.phone || "");
      setCity(me.user.city || "");

      const list = await fetch("/api/inquiries").then((r) => r.json());
      setInquiries(list.inquiries || []);
      setLoading(false);
    })();
  }, [locale, router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inquiries.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const i of inquiries) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }, [inquiries]);

  const filtered = useMemo(() => {
    if (filter === "all") return inquiries;
    return inquiries.filter((i) => i.status === filter);
  }, [inquiries, filter]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}`);
    router.refresh();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          phone,
          city,
          ...(password ? { password, currentPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || t(locale, "auth_error"));
        setSaving(false);
        return;
      }
      setUser(data.user);
      setPassword("");
      setCurrentPassword("");
      setMsg(t(locale, "account_saved"));
    } catch {
      setErr(t(locale, "auth_error"));
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted">
        …
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">{t(locale, "nav_account")}</p>
          <h1 className="display-lg mt-1 text-ink">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t(locale, "auth_logout")}
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-line">
        {(
          [
            ["orders", "account_orders"],
            ["profile", "account_profile"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              tab === id
                ? "border-green text-green"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t(locale, key)}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`${t(locale, "orders_filter_all")} (${counts.all || 0})`}
            />
            {ORDER_STATUSES.map((s) =>
              counts[s] ? (
                <FilterChip
                  key={s}
                  active={filter === s}
                  onClick={() => setFilter(s)}
                  label={`${statusLabel(locale, s)} (${counts[s]})`}
                />
              ) : null
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-bg-soft px-6 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-muted">{t(locale, "account_no_orders")}</p>
              <Link
                href={`/${locale}/catalog`}
                className="btn btn-primary mt-4 inline-flex"
              >
                {t(locale, "cta_catalog")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inq) => {
                let items: { productName: string; qty?: string; sku?: string }[] =
                  [];
                try {
                  if (inq.itemsJson) items = JSON.parse(inq.itemsJson);
                } catch {
                  /* ignore */
                }
                const history = parseStatusHistory(inq.statusHistory);
                if (
                  history.length === 0 &&
                  inq.status
                ) {
                  history.push({
                    status: inq.status,
                    at: inq.createdAt,
                  });
                }
                const open = openId === inq.id;
                const prog = statusProgress(inq.status);
                const terminal =
                  inq.status === "cancelled" || inq.status === "rejected";

                return (
                  <article
                    key={inq.id}
                    className="overflow-hidden rounded-xl border border-line bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : inq.id)}
                      className="flex w-full items-start justify-between gap-3 p-4 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-muted">
                            #{inq.id.slice(-8).toUpperCase()}
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(inq.createdAt).toLocaleString(
                              locale === "ru" ? "ru-RU" : "en-GB"
                            )}
                          </span>
                          {inq.urgency === "urgent" && (
                            <span className="text-[11px] font-bold text-amber-600">
                              {t(locale, "inquiry_urgency_urgent")}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 line-clamp-2 font-bold text-ink">
                          {inq.productName ||
                            items.map((i) => i.productName).join(", ") ||
                            "—"}
                        </h3>
                        {inq.quantity && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                            {inq.quantity}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge locale={locale} status={inq.status} />
                        {open ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Progress strip */}
                    {!terminal && (
                      <div className="border-t border-line px-4 py-3">
                        <div className="flex gap-1">
                          {PIPELINE.map((s, i) => (
                            <div
                              key={s}
                              className="flex flex-1 flex-col items-center gap-1"
                              title={statusLabel(locale, s)}
                            >
                              <div
                                className={`h-1.5 w-full rounded-full ${
                                  prog >= i ? "bg-green" : "bg-slate-100"
                                }`}
                              />
                              <span
                                className={`hidden text-[9px] font-semibold sm:block ${
                                  prog >= i ? "text-green" : "text-slate-300"
                                }`}
                              >
                                {statusLabel(locale, s)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {open && (
                      <div className="space-y-4 border-t border-line bg-bg-soft/40 px-4 py-4">
                        {items.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                              {t(locale, "orders_items")}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {items.map((it, idx) => (
                                <li
                                  key={idx}
                                  className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <span className="font-medium text-ink">
                                    {it.productName}
                                    {it.sku && (
                                      <span className="ml-2 font-mono text-[11px] text-green">
                                        {it.sku}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 text-muted">
                                    × {it.qty || 1}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {inq.trackingNumber && (
                          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                            <Truck className="h-4 w-4 shrink-0" />
                            <span>
                              {t(locale, "orders_tracking")}:{" "}
                              <strong className="font-mono">
                                {inq.trackingNumber}
                              </strong>
                            </span>
                          </div>
                        )}

                        {inq.notes && (
                          <p className="text-sm text-muted">
                            <span className="font-semibold text-ink">
                              {t(locale, "orders_notes")}:{" "}
                            </span>
                            {inq.notes}
                          </p>
                        )}

                        {inq.message && (
                          <p className="text-sm text-muted">
                            <span className="font-semibold text-ink">
                              {t(locale, "inquiry_message")}:{" "}
                            </span>
                            {inq.message}
                          </p>
                        )}

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            {t(locale, "orders_history")}
                          </p>
                          <ol className="relative mt-3 space-y-0 border-l-2 border-line pl-4">
                            {[...history].reverse().map((h, idx) => (
                              <li key={idx} className="relative pb-4 last:pb-0">
                                <span className="absolute -left-[21px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-green" />
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge
                                    locale={locale}
                                    status={h.status}
                                  />
                                  <span className="text-xs text-muted">
                                    {new Date(h.at).toLocaleString(
                                      locale === "ru" ? "ru-RU" : "en-GB"
                                    )}
                                  </span>
                                </div>
                                {h.note && (
                                  <p className="mt-1 text-xs text-muted">
                                    {h.note}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <StatusHelp locale={locale} status={inq.status} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "profile" && (
        <form
          onSubmit={saveProfile}
          className="max-w-lg space-y-3 rounded-2xl border border-line bg-white p-6"
        >
          <Field label={t(locale, "inquiry_name")} value={name} onChange={setName} />
          <Field
            label={t(locale, "inquiry_company")}
            value={company}
            onChange={setCompany}
          />
          <Field
            label={t(locale, "inquiry_phone")}
            value={phone}
            onChange={setPhone}
            type="tel"
          />
          <Field
            label={t(locale, "inquiry_city")}
            value={city}
            onChange={setCity}
          />
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              {t(locale, "account_change_password")}
            </p>
            <Field
              label={t(locale, "auth_current_password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
            />
            <div className="mt-3">
              <Field
                label={t(locale, "auth_new_password")}
                value={password}
                onChange={setPassword}
                type="password"
              />
            </div>
          </div>
          {msg && (
            <p className="rounded-lg bg-green-soft px-3 py-2 text-sm text-green-deep">
              {msg}
            </p>
          )}
          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-60"
          >
            {saving ? "…" : t(locale, "account_save")}
          </button>
        </form>
      )}
    </div>
  );
}

function statusLabel(locale: "ru" | "en", status: string): string {
  const key = `status_${status}`;
  const v = t(locale, key);
  return v === key ? status : v;
}

function StatusBadge({
  locale,
  status,
}: {
  locale: "ru" | "en";
  status: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(status)}`}
    >
      <StatusIcon status={status} />
      {statusLabel(locale, status)}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const cls = "h-3 w-3";
  switch (status) {
    case "delivered":
      return <CheckCircle2 className={cls} />;
    case "shipped":
      return <Truck className={cls} />;
    case "cancelled":
    case "rejected":
      return <XCircle className={cls} />;
    case "processing":
    case "confirmed":
      return <Clock className={cls} />;
    default:
      return <Package className={cls} />;
  }
}

function StatusHelp({
  locale,
  status,
}: {
  locale: "ru" | "en";
  status: string;
}) {
  const key = `status_help_${status}`;
  const text = t(locale, key);
  if (text === key) return null;
  return (
    <p className="rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-muted">
      {text}
    </p>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
        active
          ? "bg-green text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
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
        className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/15"
      />
    </div>
  );
}
