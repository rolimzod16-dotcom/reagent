"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { Field, TextArea } from "@/components/admin/fields";

type Row = {
  id: string;
  slug: string;
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
  catalogSlug: string | null;
  sortOrder: number;
  published: boolean;
};

const emptyForm = {
  titleRu: "",
  titleEn: "",
  bodyRu: "",
  bodyEn: "",
  catalogSlug: "",
  published: true,
};

export default function AdminSolutionsPage() {
  const gate = useAdminKey();
  const [rows, setRows] = useState<Row[]>([]);
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
    const res = await fetch("/api/admin/solutions", {
      headers: { "x-admin-key": gate.adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Ошибка загрузки решений");
      return;
    }
    const data = await res.json();
    setRows(data.solutions || []);
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
      titleRu: row.titleRu || "",
      titleEn: row.titleEn || "",
      bodyRu: row.bodyRu || "",
      bodyEn: row.bodyEn || "",
      catalogSlug: row.catalogSlug || "",
      published: !!row.published,
    });
    setEditorOpen(true);
    setMsg("");
    setErr("");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.titleRu.trim()) {
      setErr("Укажите название");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    const payload = {
      titleRu: form.titleRu.trim(),
      titleEn: form.titleEn.trim() || form.titleRu.trim(),
      bodyRu: form.bodyRu,
      bodyEn: form.bodyEn || form.bodyRu,
      catalogSlug: form.catalogSlug.trim() || null,
      published: form.published,
    };
    const res = await fetch(
      editingId ? `/api/admin/solutions/${editingId}` : "/api/admin/solutions",
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
    setMsg(editingId ? "Решение обновлено" : "Решение добавлено");
    setEditorOpen(false);
    load();
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Удалить решение «${name}»?`)) return;
    const res = await fetch(`/api/admin/solutions/${id}`, {
      method: "DELETE",
      headers: gate.headers(false),
    });
    if (!res.ok) {
      setErr("Не удалось удалить");
      return;
    }
    setMsg("Удалено");
    load();
  }

  return (
    <AdminShell title="Решения" tab="solutions" gate={gate}>
      {!gate.unlocked ? null : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Карточки на странице «Решения». Ссылка ведёт в категорию каталога
              (slug), если указать.
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
                Добавить решение
              </button>
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
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-sm text-slate-500">Решений пока нет</p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white"
              >
                Добавить первое
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Название</th>
                    <th className="px-3 py-2.5 font-bold">Каталог</th>
                    <th className="px-3 py-2.5 font-bold">Статус</th>
                    <th className="px-3 py-2.5 font-bold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-900">{r.titleRu}</p>
                        <p className="text-xs text-slate-400">{r.slug}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                        {r.catalogSlug || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.published
                              ? "bg-green-50 text-green-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.published ? "Опубликовано" : "Скрыто"}
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
                            href="/ru/solutions"
                            target="_blank"
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700"
                            title="Открыть на сайте"
                          >
                            →
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDelete(r.id, r.titleRu)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Удалить"
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
            <EditorModal
              title={editingId ? "Редактировать решение" : "Новое решение"}
              onClose={() => setEditorOpen(false)}
              saving={saving}
              onSave={onSave}
              err={err}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Название (RU) *"
                  value={form.titleRu}
                  onChange={(v) => setForm((f) => ({ ...f, titleRu: v }))}
                  required
                />
                <Field
                  label="Название (EN)"
                  value={form.titleEn}
                  onChange={(v) => setForm((f) => ({ ...f, titleEn: v }))}
                />
              </div>
              <TextArea
                label="Описание (RU)"
                value={form.bodyRu}
                onChange={(v) => setForm((f) => ({ ...f, bodyRu: v }))}
                rows={4}
              />
              <TextArea
                label="Описание (EN)"
                value={form.bodyEn}
                onChange={(v) => setForm((f) => ({ ...f, bodyEn: v }))}
                rows={3}
              />
              <Field
                label="Slug категории каталога"
                value={form.catalogSlug}
                onChange={(v) => setForm((f) => ({ ...f, catalogSlug: v }))}
                placeholder="laboratoriya"
              />
              <p className="-mt-2 text-[11px] text-slate-400">
                Карточка ведёт на /catalog/этот-slug. Пусто — на весь каталог.
              </p>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published: e.target.checked }))
                  }
                  className="accent-green-700"
                />
                Опубликовано
              </label>
            </EditorModal>
          )}
        </>
      )}
    </AdminShell>
  );
}

function EditorModal({
  title,
  children,
  onClose,
  saving,
  onSave,
  err,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  saving: boolean;
  onSave: (e: FormEvent) => void;
  err: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={onSave}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
        >
          {children}
          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
        </form>
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
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
  );
}
