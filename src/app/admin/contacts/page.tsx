"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { Field, TextArea } from "@/components/admin/fields";

const empty = {
  email: "",
  phone: "",
  addressRu: "",
  addressEn: "",
  hoursRu: "",
  hoursEn: "",
  noteRu: "",
  noteEn: "",
};

export default function AdminContactsPage() {
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
    const res = await fetch("/api/admin/settings", {
      headers: { "x-admin-key": gate.adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Не удалось загрузить контакты");
      return;
    }
    const data = await res.json();
    const s = data.settings || {};
    setForm({
      email: s.email || "",
      phone: s.phone || "",
      addressRu: s.addressRu || "",
      addressEn: s.addressEn || "",
      hoursRu: s.hoursRu || "",
      hoursEn: s.hoursEn || "",
      noteRu: s.noteRu || "",
      noteEn: s.noteEn || "",
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
    const res = await fetch("/api/admin/settings", {
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
    setMsg("Контакты обновлены — шапка, подвал и страница «Контакты» на сайте");
  }

  return (
    <AdminShell title="Контакты" tab="contacts" gate={gate}>
      {!gate.unlocked ? null : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Телефон и email показываются в шапке, подвале и на странице
              контактов. После сохранения обновление на сайте занимает до минуты.
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
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  required
                />
                <Field
                  label="Телефон *"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  required
                  placeholder="+992 …"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Адрес (RU)"
                  value={form.addressRu}
                  onChange={(v) => setForm((f) => ({ ...f, addressRu: v }))}
                  placeholder="Душанбе, Таджикистан"
                />
                <Field
                  label="Адрес (EN)"
                  value={form.addressEn}
                  onChange={(v) => setForm((f) => ({ ...f, addressEn: v }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Часы работы (RU)"
                  value={form.hoursRu}
                  onChange={(v) => setForm((f) => ({ ...f, hoursRu: v }))}
                  placeholder="Пн–Пт, 9:00–18:00"
                />
                <Field
                  label="Часы работы (EN)"
                  value={form.hoursEn}
                  onChange={(v) => setForm((f) => ({ ...f, hoursEn: v }))}
                />
              </div>
              <TextArea
                label="Примечание (RU)"
                value={form.noteRu}
                onChange={(v) => setForm((f) => ({ ...f, noteRu: v }))}
                rows={3}
                placeholder="Цена по запросу. Ответим в рабочее время."
              />
              <TextArea
                label="Примечание (EN)"
                value={form.noteEn}
                onChange={(v) => setForm((f) => ({ ...f, noteEn: v }))}
                rows={3}
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Сохранение…" : "Сохранить контакты"}
              </button>
            </form>
          )}
        </>
      )}
    </AdminShell>
  );
}
