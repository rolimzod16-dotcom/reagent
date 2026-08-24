"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUSES,
  parseStatusHistory,
  statusBadgeClass,
} from "@/lib/order-status";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import {
  Search,
  Phone,
  Mail,
  Building2,
  MapPin,
  Package,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Truck,
  MessageSquare,
  Clock,
  Filter,
} from "lucide-react";

type CartItem = {
  productId?: string | null;
  productName: string;
  sku?: string | null;
  qty?: string | null;
};

type Inquiry = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  city: string | null;
  productName: string | null;
  quantity: string | null;
  message: string | null;
  status: string;
  urgency: string;
  trackingNumber: string | null;
  notes: string | null;
  statusHistory: string | null;
  itemsJson: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
  product?: { slug: string; sku: string | null } | null;
  user?: { email: string; name: string } | null;
};

const STATUS_RU: Record<string, string> = {
  new: "Новая",
  processing: "В обработке",
  confirmed: "Подтверждена",
  shipped: "Отправлена",
  delivered: "Доставлена",
  cancelled: "Отменена",
  rejected: "Отклонена",
};

function parseItems(inq: Inquiry): CartItem[] {
  try {
    if (inq.itemsJson) {
      const raw = JSON.parse(inq.itemsJson);
      if (Array.isArray(raw) && raw.length) return raw;
    }
  } catch {
    /* ignore */
  }
  if (inq.productName) {
    return [
      {
        productName: inq.productName,
        sku: inq.product?.sku || null,
        qty: inq.quantity?.match(/×\s*(\d+)/)?.[1] || "1",
      },
    ];
  }
  return [];
}

function orderNo(id: string) {
  return id.slice(-8).toUpperCase();
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const gate = useAdminKey();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const [draftTrack, setDraftTrack] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const adminKey = gate.adminKey;
  const unlocked = gate.unlocked;

  const load = useCallback(async () => {
    if (!unlocked || !adminKey) return;
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/admin/inquiries", {
      headers: { "x-admin-key": adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setInquiries([]);
      setErr(
        res.status === 401
          ? "Неверный ADMIN_KEY или ключ не задан в env"
          : "Ошибка загрузки"
      );
      return;
    }
    const data = await res.json();
    const list: Inquiry[] = data.inquiries || [];
    setInquiries(list);
    const tracks: Record<string, string> = {};
    const notes: Record<string, string> = {};
    for (const i of list) {
      tracks[i.id] = i.trackingNumber || "";
      notes[i.id] = i.notes || "";
    }
    setDraftTrack(tracks);
    setDraftNotes(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lock is stable enough
  }, [unlocked, adminKey]);

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked, load]);

  async function patchInquiry(
    id: string,
    body: {
      status?: string;
      trackingNumber?: string | null;
      notes?: string | null;
      note?: string;
    }
  ) {
    if (!gate.unlocked) return false;
    setSavingId(id);
    setMsg("");
    setErr("");
    const res = await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: gate.headers(),
      body: JSON.stringify(body),
    });
    setSavingId(null);
    if (res.ok) {
      setMsg("Сохранено");
      await load();
      return true;
    }
    const d = await res.json().catch(() => ({}));
    setErr(d.error || "Ошибка сохранения");
    return false;
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* ignore */
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inquiries.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const i of inquiries) c[i.status] = (c[i.status] || 0) + 1;
    c.urgent = inquiries.filter((i) => i.urgency === "urgent").length;
    return c;
  }, [inquiries]);

  const filtered = useMemo(() => {
    let list = inquiries;
    if (filter === "urgent") {
      list = list.filter((i) => i.urgency === "urgent");
    } else if (filter !== "all") {
      list = list.filter((i) => i.status === filter);
    }
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((i) => {
        const items = parseItems(i)
          .map((x) => `${x.productName} ${x.sku || ""}`)
          .join(" ");
        const hay = [
          i.name,
          i.company,
          i.email,
          i.phone,
          i.city,
          i.productName,
          i.message,
          i.id,
          orderNo(i.id),
          items,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }
    return list;
  }, [inquiries, filter, q]);

  return (
    <AdminShell title="Панель заявок" tab="inquiries" gate={gate}>
      {!gate.unlocked ? null : (
        <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => load()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Обновить
              </button>
            </div>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              <StatCard
                label="Всего"
                value={counts.all}
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              {ORDER_STATUSES.slice(0, 5).map((s) => (
                <StatCard
                  key={s}
                  label={STATUS_RU[s]}
                  value={counts[s] || 0}
                  active={filter === s}
                  onClick={() => setFilter(s)}
                />
              ))}
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск: имя, телефон, email, товар, № заявки…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="all">Все статусы</option>
                  <option value="urgent">
                    🔥 Срочные ({counts.urgent || 0})
                  </option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_RU[s]} ({counts[s] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {msg && (
              <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                {msg}
              </p>
            )}
            {err && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {err}
              </p>
            )}

            {loading ? (
              <p className="text-sm text-slate-500">Загрузка…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
                <Package className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  {inquiries.length === 0
                    ? "Заявок пока нет"
                    : "Ничего не найдено по фильтру"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Показано {filtered.length} из {inquiries.length}
                </p>
                {filtered.map((inq) => {
                  const items = parseItems(inq);
                  const open = openId === inq.id;
                  const history = parseStatusHistory(inq.statusHistory);
                  const saving = savingId === inq.id;

                  return (
                    <article
                      key={inq.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                        inq.urgency === "urgent"
                          ? "border-amber-300 ring-1 ring-amber-100"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Summary row */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(open ? null : inq.id);
                        }}
                        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                              #{orderNo(inq.id)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusBadgeClass(inq.status)}`}
                            >
                              {STATUS_RU[inq.status] || inq.status}
                            </span>
                            {inq.urgency === "urgent" && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                СРОЧНО
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {fmtDate(inq.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 text-base font-extrabold text-slate-900">
                            {inq.name}
                            {inq.company ? (
                              <span className="font-semibold text-slate-500">
                                {" "}
                                · {inq.company}
                              </span>
                            ) : null}
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-green-800">
                              <Phone className="h-3.5 w-3.5" />
                              {inq.phone}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <Mail className="h-3.5 w-3.5" />
                              {inq.email}
                            </span>
                            {inq.city && (
                              <span className="inline-flex items-center gap-1.5 text-slate-500">
                                <MapPin className="h-3.5 w-3.5" />
                                {inq.city}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 line-clamp-1 text-sm text-slate-600">
                            <Package className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                            {items.length
                              ? items
                                  .map(
                                    (it) =>
                                      `${it.productName}${it.qty ? ` ×${it.qty}` : ""}`
                                  )
                                  .join(" · ")
                              : inq.productName || "Без товара"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                          <span className="text-xs font-semibold text-slate-400">
                            {open ? "Свернуть" : "Открыть"}
                          </span>
                          {open ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {open && (
                        <div className="space-y-5 border-t border-slate-100 bg-slate-50/80 px-4 py-5 sm:px-5">
                          {/* Client block */}
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Клиент
                              </p>
                              <dl className="space-y-2.5 text-sm">
                                <DetailRow
                                  icon={<Building2 className="h-4 w-4" />}
                                  label="ФИО"
                                  value={inq.name}
                                  onCopy={() => copyText("name", inq.name)}
                                  copied={copied === "name"}
                                />
                                {inq.company && (
                                  <DetailRow
                                    icon={<Building2 className="h-4 w-4" />}
                                    label="Компания"
                                    value={inq.company}
                                    onCopy={() =>
                                      copyText("company", inq.company || "")
                                    }
                                    copied={copied === "company"}
                                  />
                                )}
                                <DetailRow
                                  icon={<Phone className="h-4 w-4" />}
                                  label="Телефон"
                                  value={inq.phone}
                                  href={`tel:${inq.phone.replace(/\s/g, "")}`}
                                  onCopy={() => copyText("phone", inq.phone)}
                                  copied={copied === "phone"}
                                  highlight
                                />
                                <DetailRow
                                  icon={<Mail className="h-4 w-4" />}
                                  label="Email"
                                  value={inq.email}
                                  href={`mailto:${inq.email}`}
                                  onCopy={() => copyText("email", inq.email)}
                                  copied={copied === "email"}
                                />
                                {inq.city && (
                                  <DetailRow
                                    icon={<MapPin className="h-4 w-4" />}
                                    label="Город"
                                    value={inq.city}
                                  />
                                )}
                                <DetailRow
                                  icon={<Clock className="h-4 w-4" />}
                                  label="Создана"
                                  value={fmtDate(inq.createdAt)}
                                />
                                {inq.user && (
                                  <p className="pt-1 text-xs text-green-700">
                                    ✓ Привязан аккаунт: {inq.user.email}
                                  </p>
                                )}
                              </dl>
                            </div>

                            {/* Status controls */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Управление
                              </p>
                              <label className="mb-1 block text-xs font-semibold text-slate-500">
                                Статус заказа
                              </label>
                              <select
                                value={inq.status}
                                disabled={saving}
                                onChange={(e) =>
                                  patchInquiry(inq.id, {
                                    status: e.target.value,
                                    note: `Статус: ${STATUS_RU[e.target.value] || e.target.value}`,
                                  })
                                }
                                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold"
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_RU[s]}
                                  </option>
                                ))}
                              </select>

                              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                <Truck className="h-3.5 w-3.5" />
                                Трек / накладная
                              </label>
                              <div className="mb-3 flex gap-2">
                                <input
                                  value={draftTrack[inq.id] ?? ""}
                                  onChange={(e) =>
                                    setDraftTrack((d) => ({
                                      ...d,
                                      [inq.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Например TT1234567890"
                                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    patchInquiry(inq.id, {
                                      trackingNumber:
                                        draftTrack[inq.id]?.trim() || null,
                                      note: draftTrack[inq.id]?.trim()
                                        ? `Трек: ${draftTrack[inq.id].trim()}`
                                        : "Трек удалён",
                                    })
                                  }
                                  className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  OK
                                </button>
                              </div>

                              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Заметка менеджера
                              </label>
                              <textarea
                                value={draftNotes[inq.id] ?? ""}
                                onChange={(e) =>
                                  setDraftNotes((d) => ({
                                    ...d,
                                    [inq.id]: e.target.value,
                                  }))
                                }
                                rows={3}
                                placeholder="Внутренний комментарий…"
                                className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  patchInquiry(inq.id, {
                                    notes: draftNotes[inq.id]?.trim() || null,
                                  })
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Сохранить заметку
                              </button>
                              {saving && (
                                <p className="mt-2 text-xs text-slate-400">
                                  Сохранение…
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Products table */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Выбранные товары ({items.length})
                            </p>
                            {items.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Товары не указаны (общая заявка)
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[320px] text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[11px] uppercase text-slate-400">
                                      <th className="pb-2 pr-3 font-bold">
                                        №
                                      </th>
                                      <th className="pb-2 pr-3 font-bold">
                                        Название
                                      </th>
                                      <th className="pb-2 pr-3 font-bold">
                                        Артикул
                                      </th>
                                      <th className="pb-2 font-bold">Кол-во</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((it, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b border-slate-50"
                                      >
                                        <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">
                                          {idx + 1}
                                        </td>
                                        <td className="py-2.5 pr-3 font-semibold text-slate-900">
                                          {it.productName}
                                          {inq.product?.slug &&
                                            idx === 0 &&
                                            it.productName ===
                                              inq.productName && (
                                              <Link
                                                href={`/ru/product/${inq.product.slug}`}
                                                target="_blank"
                                                className="ml-2 text-xs font-medium text-green-700 hover:underline"
                                              >
                                                открыть
                                              </Link>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-xs text-green-800">
                                          {it.sku ||
                                            inq.product?.sku ||
                                            "—"}
                                        </td>
                                        <td className="py-2.5 font-bold text-slate-800">
                                          {it.qty || "1"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {inq.quantity && items.length > 1 && (
                              <p className="mt-2 text-xs text-slate-400">
                                Сводка: {inq.quantity}
                              </p>
                            )}
                          </div>

                          {/* Client message */}
                          {inq.message && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Комментарий клиента
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                {inq.message}
                              </p>
                            </div>
                          )}

                          {/* History */}
                          {history.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                История статусов
                              </p>
                              <ol className="space-y-2 border-l-2 border-slate-100 pl-4">
                                {[...history].reverse().map((h, idx) => (
                                  <li key={idx} className="relative text-sm">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-green-600" />
                                    <span
                                      className={`mr-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(h.status)}`}
                                    >
                                      {STATUS_RU[h.status] || h.status}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {fmtDate(h.at)}
                                    </span>
                                    {h.note && (
                                      <p className="mt-0.5 text-xs text-slate-500">
                                        {h.note}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                            <span>ID: {inq.id}</span>
                            <span>·</span>
                            <span>Локаль: {inq.locale || "ru"}</span>
                            <span>·</span>
                            <span>Обновлено: {fmtDate(inq.updatedAt)}</span>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
        </>
      )}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-green-600 bg-green-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-xl font-extrabold text-slate-900">{value}</p>
    </button>
  );
}

function DetailRow({
  icon,
  label,
  value,
  href,
  onCopy,
  copied,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  onCopy?: () => void;
  copied?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase text-slate-400">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className={`break-all font-semibold hover:underline ${
              highlight ? "text-base text-green-800" : "text-slate-800"
            }`}
          >
            {value}
          </a>
        ) : (
          <p
            className={`break-all font-semibold ${
              highlight ? "text-base text-green-800" : "text-slate-800"
            }`}
          >
            {value}
          </p>
        )}
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Копировать"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
