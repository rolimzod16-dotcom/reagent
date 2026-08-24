"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { Field, TextArea } from "@/components/admin/fields";

type Row = {
  id: string;
  slug: string;
  name: string;
  descriptionRu: string | null;
  descriptionEn: string | null;
  website: string | null;
  published: boolean;
  _count?: { products: number };
};

const emptyForm = {
  name: "",
  descriptionRu: "",
  descriptionEn: "",
  website: "",
  published: true,
};

export default function AdminBrandsPage() {
  const gate = useAdminKey();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!gate.unlocked || !gate.adminKey) return;
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin/brands", {
      headers: { "x-admin-key": gate.adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Ошибка загрузки производителей");
      return;
    }
    const data = await res.json();
    setRows(data.brands || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.unlocked, gate.adminKey]);

  useEffect(() => {
    if (gate.unlocked) load();
  }, [gate.unlocked, load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
    setMsg("");
    setErr("");
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      descriptionRu: row.descriptionRu || "",
      descriptionEn: row.descriptionEn || "",
      website: row.website || "",
      published: !!row.published,
    });
    setEditorOpen(true);
    setMsg("");
    setErr("");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr("Укажите название");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    const payload = {
      name: form.name.trim(),
      descriptionRu: form.descriptionRu.trim() || undefined,
      descriptionEn: form.descriptionEn.trim() || undefined,
      website: form.website.trim() || null,
      published: form.published,
    };
    const res = await fetch(
      editingId ? `/api/admin/brands/${editingId}` : "/api/admin/brands",
      {
        method: editingId ? "PATCH" : "POST",
        headers: gate.headers(),
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Ошибка сохранения");
      return;
    }
    setMsg(editingId ? "Производитель обновлён" : "Производитель добавлен");
    setEditorOpen(false);
    load();
  }

  async function onDelete(row: Row) {
    const n = row._count?.products || 0;
    const ok = n
      ? confirm(
          `У «${row.name}» ${n} товар(ов). Бренд будет скрыт, не удалён. Продолжить?`
        )
      : confirm(`Удалить производителя «${row.name}»?`);
    if (!ok) return;
    const res = await fetch(`/api/admin/brands/${row.id}`, {
      method: "DELETE",
      headers: gate.headers(false),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(d.error || "Не удалось удалить");
      return;
    }
    setMsg(d.unpublished ? d.message || "Скрыт" : "Удалено");
    load();
  }

  const filtered = q.trim()
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(q.trim().toLowerCase())
      )
    : rows;

  return (
    <AdminShell title="Производители" tab="brands" gate={gate}>
      {!gate.unlocked ? null : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Страница /ru/brands. Сейчас:{" "}
              <strong className="text-slate-800">{rows.length}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => load()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Обновить
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </button>
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию…"
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 sm:max-w-md"
          />

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
              <p className="text-sm text-slate-500">Производителей не найдено</p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white"
              >
                Добавить первого
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Производитель</th>
                    <th className="px-3 py-2.5 font-bold">Товаров</th>
                    <th className="px-3 py-2.5 font-bold">Статус</th>
                    <th className="px-3 py-2.5 font-bold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-400">
                          {r.website || r.slug}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {r._count?.products ?? 0}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.published
                              ? "bg-green-50 text-green-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.published ? "Опубликован" : "Скрыт"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700"
                            title="Редактировать"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/ru/brands/${r.slug}`}
                            target="_blank"
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700"
                            title="Открыть на сайте"
                          >
                            →
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Удалить / скрыть"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/50"
                onClick={() => setEditorOpen(false)}
                aria-label="Закрыть"
              />
              <div className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {editingId ? "Редактировать производителя" : "Новый производитель"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                  onSubmit={onSave}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
                >
                  <Field
                    label="Название *"
                    value={form.name}
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                    required
                  />
                  <Field
                    label="Сайт"
                    value={form.website}
                    onChange={(v) => setForm((f) => ({ ...f, website: v }))}
                    placeholder="https://…"
                  />
                  <TextArea
                    label="Описание (RU)"
                    value={form.descriptionRu}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, descriptionRu: v }))
                    }
                    rows={4}
                  />
                  <TextArea
                    label="Описание (EN)"
                    value={form.descriptionEn}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, descriptionEn: v }))
                    }
                    rows={3}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, published: e.target.checked }))
                      }
                      className="accent-green-700"
                    />
                    Опубликован
                  </label>
                  {err && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {err}
                    </p>
                  )}
                </form>
                <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) =>
                      onSave(e as unknown as FormEvent<HTMLFormElement>)
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
