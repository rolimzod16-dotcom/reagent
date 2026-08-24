"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { Field, TextArea } from "@/components/admin/fields";

const empty = {
  titleRu: "",
  titleEn: "",
  bodyRu: "",
  bodyEn: "",
};

export default function AdminAboutPage() {
  const gate = useAdminKey();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!gate.unlocked || !gate.adminKey) return;
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin/pages/about", {
      headers: { "x-admin-key": gate.adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Не удалось загрузить страницу «О компании»");
      return;
    }
    const data = await res.json();
    const p = data.page || {};
    setForm({
      titleRu: p.titleRu || "",
      titleEn: p.titleEn || "",
      bodyRu: p.bodyRu || "",
      bodyEn: p.bodyEn || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.unlocked, gate.adminKey]);

  useEffect(() => {
    if (gate.unlocked) load();
  }, [gate.unlocked, load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/admin/pages/about", {
      method: "PUT",
      headers: gate.headers(),
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Ошибка сохранения");
      return;
    }
    setMsg("Страница «О компании» обновлена на сайте");
  }

  return (
    <AdminShell title="О компании" tab="about" gate={gate}>
      {!gate.unlocked ? null : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Текст страницы /ru/about. Абзацы разделяйте пустой строкой.
            </p>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Обновить
            </button>
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
          ) : (
            <form
              onSubmit={onSave}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Заголовок (RU) *"
                  value={form.titleRu}
                  onChange={(v) => setForm((f) => ({ ...f, titleRu: v }))}
                  required
                />
                <Field
                  label="Заголовок (EN)"
                  value={form.titleEn}
                  onChange={(v) => setForm((f) => ({ ...f, titleEn: v }))}
                />
              </div>
              <TextArea
                label="Текст (RU) *"
                value={form.bodyRu}
                onChange={(v) => setForm((f) => ({ ...f, bodyRu: v }))}
                rows={16}
                required
              />
              <TextArea
                label="Текст (EN)"
                value={form.bodyEn}
                onChange={(v) => setForm((f) => ({ ...f, bodyEn: v }))}
                rows={10}
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </form>
          )}
        </>
      )}
    </AdminShell>
  );
}
