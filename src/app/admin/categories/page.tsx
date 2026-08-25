"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { Field } from "@/components/admin/fields";

type CatNode = {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  image: string | null;
  parentId: string | null;
  published: boolean;
  displayImage: string;
  defaultImage: string;
  productCount: number;
  subtreeCount: number;
  children: CatNode[];
};

type Editor = {
  mode: "create" | "edit";
  parentId: string | null;
  editingId: string | null;
  nameRu: string;
  nameEn: string;
  image: string;
};

const emptyEditor: Editor = {
  mode: "create",
  parentId: null,
  editingId: null,
  nameRu: "",
  nameEn: "",
  image: "",
};

function flatten(
  nodes: CatNode[],
  depth = 0
): { node: CatNode; depth: number }[] {
  const out: { node: CatNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

function findNode(nodes: CatNode[], id: string): CatNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

function patchNode(
  nodes: CatNode[],
  id: string,
  patch: Partial<CatNode>
): CatNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : { ...n, children: patchNode(n.children, id, patch) }
  );
}

export default function AdminCategoriesPage() {
  const gate = useAdminKey();
  const [tree, setTree] = useState<CatNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);
  const [uploadingEditor, setUploadingEditor] = useState(false);
  const [visFilter, setVisFilter] = useState<"all" | "live" | "hidden">("all");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const editorFileRef = useRef<HTMLInputElement | null>(null);

  const adminKey = gate.adminKey;

  const load = useCallback(async () => {
    if (!gate.unlocked || !adminKey) return;
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin/categories", {
      headers: { "x-admin-key": adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Не удалось загрузить категории");
      return;
    }
    const data = await res.json();
    const next: CatNode[] = data.tree || [];
    setTree(next);
    setTotal(data.total || 0);
    setOpen((prev) => {
      const roots = next.map((n) => n.id);
      return prev.size ? prev : new Set(roots);
    });
    const d: Record<string, string> = {};
    for (const { node } of flatten(next)) {
      d[node.id] = node.image || "";
    }
    setDrafts(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.unlocked, adminKey]);

  useEffect(() => {
    if (gate.unlocked) load();
  }, [gate.unlocked, load]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId: string | null) {
    setEditor({ ...emptyEditor, mode: "create", parentId });
    setMsg("");
    setErr("");
    if (parentId) {
      setOpen((prev) => new Set(prev).add(parentId));
    }
  }

  function openEdit(node: CatNode) {
    setEditor({
      mode: "edit",
      parentId: node.parentId,
      editingId: node.id,
      nameRu: node.nameRu,
      nameEn: node.nameEn,
      image: node.image || "",
    });
    setMsg("");
    setErr("");
  }

  async function saveImage(id: string, image: string | null) {
    if (!adminKey) return;
    setBusyId(id);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Не удалось сохранить фото");
        return;
      }
      const cat = data.category;
      setTree((t) =>
        patchNode(t, id, {
          image: cat.image,
          displayImage: cat.displayImage,
        })
      );
      setDrafts((d) => ({ ...d, [id]: cat.image || "" }));
      setMsg("Фото обновлено");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Сеть / таймаут");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadTo(
    file: File
  ): Promise<string | null> {
    if (!adminKey) return null;
    const okTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (file.type && !okTypes.includes(file.type)) {
      setErr("Нужен JPG, PNG, WEBP или GIF (не HEIC)");
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr("Файл больше 4 МБ — сожмите фото");
      return null;
    }
    const body = new FormData();
    body.append("file", file, file.name || "category.jpg");
    body.append("folder", "categories");
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setErr(data.error || "Не удалось загрузить файл");
      return null;
    }
    return data.url as string;
  }

  async function uploadFile(id: string, file: File) {
    setBusyId(id);
    setErr("");
    setMsg("");
    try {
      const url = await uploadTo(file);
      if (!url) {
        setBusyId(null);
        return;
      }
      await saveImage(id, url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
      setBusyId(null);
    }
  }

  async function submitEditor(e: FormEvent) {
    e.preventDefault();
    if (!adminKey || !editor) return;
    if (editor.nameRu.trim().length < 2) {
      setErr("Название (RU) минимум 2 символа");
      return;
    }
    setSavingEditor(true);
    setErr("");
    setMsg("");
    try {
      if (editor.mode === "create") {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({
            nameRu: editor.nameRu.trim(),
            nameEn: editor.nameEn.trim() || null,
            parentId: editor.parentId,
            image: editor.image.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || "Не удалось создать");
          return;
        }
        setMsg(
          editor.parentId
            ? "Подкатегория добавлена — она появится в каталоге"
            : "Категория добавлена — она появится в каталоге"
        );
        if (editor.parentId) {
          setOpen((prev) => new Set(prev).add(editor.parentId!));
        }
      } else if (editor.editingId) {
        const res = await fetch(`/api/admin/categories/${editor.editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({
            nameRu: editor.nameRu.trim(),
            nameEn: editor.nameEn.trim() || null,
            image: editor.image.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || "Не удалось сохранить");
          return;
        }
        setMsg("Категория обновлена");
      }
      setEditor(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Сеть / таймаут");
    } finally {
      setSavingEditor(false);
    }
  }

  async function setPublished(node: CatNode, published: boolean) {
    if (!adminKey) return;
    setBusyId(node.id);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/categories/${node.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ published }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Не удалось изменить видимость");
        return;
      }
      setTree((t) => patchNode(t, node.id, { published }));
      setMsg(
        published
          ? `«${node.nameRu}» снова на сайте`
          : `«${node.nameRu}» скрыта с сайта`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Сеть / таймаут");
    } finally {
      setBusyId(null);
    }
  }

  async function removeNode(node: CatNode) {
    if (!adminKey) return;
    const ok = window.confirm(
      node.subtreeCount > 0
        ? `В «${node.nameRu}» есть товары (${node.subtreeCount}). Раздел будет скрыт, товары останутся. Продолжить?`
        : `Удалить «${node.nameRu}» и пустые подкатегории?`
    );
    if (!ok) return;
    setBusyId(node.id);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/categories/${node.id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Не удалось удалить");
        return;
      }
      setMsg(data.message || (data.unpublished ? "Раздел скрыт" : "Удалено"));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Сеть / таймаут");
    } finally {
      setBusyId(null);
    }
  }

  const allRows = flatten(tree);
  const liveCount = allRows.filter((r) => r.node.published).length;
  const hiddenCount = allRows.filter((r) => !r.node.published).length;
  const query = q.trim().toLowerCase();
  const rows = allRows.filter(({ node }) => {
    if (visFilter === "live" && !node.published) return false;
    if (visFilter === "hidden" && node.published) return false;
    if (!query) return true;
    return (
      node.nameRu.toLowerCase().includes(query) ||
      node.nameEn.toLowerCase().includes(query) ||
      node.slug.toLowerCase().includes(query)
    );
  });

  const visible =
    query || visFilter !== "all"
      ? rows
      : rows.filter(({ node }) => isVisible(tree, node.id, open));

  const parentLabel = editor?.parentId
    ? findNode(tree, editor.parentId)?.nameRu || "раздел"
    : null;

  return (
    <AdminShell title="Категории" tab="categories" gate={gate}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Разделы и подразделы: фото, названия, скрыть / вернуть на сайт.
          Товары не удаляются.
          {total ? ` · ${total} шт.` : ""}
          {hiddenCount ? ` · скрыто ${hiddenCount}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-sm font-bold text-white hover:bg-green-800"
          >
            <Plus className="h-4 w-4" />
            Категория
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", `Все (${total})`],
            ["live", `На сайте (${liveCount})`],
            ["hidden", `Скрытые (${hiddenCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVisFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              visFilter === id
                ? "bg-green-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск категории / подкатегории"
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
        />
      </div>

      {msg ? (
        <p className="mb-3 text-sm font-medium text-green-700">{msg}</p>
      ) : null}
      {err ? (
        <p className="mb-3 text-sm font-medium text-red-600">{err}</p>
      ) : null}

      {editor ? (
        <form
          onSubmit={submitEditor}
          className="mb-5 rounded-2xl border border-green-200 bg-green-50/50 p-4 sm:p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {editor.mode === "create"
                  ? editor.parentId
                    ? "Новая подкатегория"
                    : "Новая категория"
                  : "Редактировать"}
              </p>
              {parentLabel ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  Внутри: {parentLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Название RU"
              value={editor.nameRu}
              onChange={(v) => setEditor({ ...editor, nameRu: v })}
              required
              placeholder="Например: УЗИ аппараты"
            />
            <Field
              label="Название EN"
              value={editor.nameEn}
              onChange={(v) => setEditor({ ...editor, nameEn: v })}
              placeholder="Ultrasound machines"
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
              Фото
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {editor.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editor.image}
                  alt=""
                  className="h-16 w-24 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-300">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <input
                value={editor.image}
                onChange={(e) =>
                  setEditor({ ...editor, image: e.target.value })
                }
                placeholder="https://… или загрузите файл"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                ref={editorFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadingEditor(true);
                  const url = await uploadTo(f);
                  setUploadingEditor(false);
                  if (url) setEditor((ed) => (ed ? { ...ed, image: url } : ed));
                }}
              />
              <button
                type="button"
                disabled={uploadingEditor}
                onClick={() => editorFileRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingEditor ? "…" : "Файл"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={savingEditor}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingEditor
                ? "Сохранение…"
                : editor.mode === "create"
                  ? "Добавить"
                  : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading && !tree.length ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            Загрузка…
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            Ничего не найдено
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map(({ node, depth }) => {
              const hasKids = node.children.length > 0;
              const opened = open.has(node.id);
              const busy = busyId === node.id;
              return (
                <li
                  key={node.id}
                  className={`px-3 py-3 sm:px-4 ${
                    node.published ? "" : "bg-slate-50 opacity-70"
                  }`}
                >
                  <div
                    className="flex flex-col gap-3 lg:flex-row lg:items-center"
                    style={{ paddingLeft: Math.min(depth, 6) * 16 }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {hasKids && !query ? (
                        <button
                          type="button"
                          onClick={() => toggle(node.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={opened ? "Свернуть" : "Развернуть"}
                        >
                          {opened ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {node.displayImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={node.displayImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {node.nameRu}
                          {!node.published ? (
                            <span className="ml-2 text-[10px] font-bold uppercase text-amber-600">
                              скрыта
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {depth === 0 ? "Категория" : "Подкатегория"}
                          {node.nameEn ? ` · ${node.nameEn}` : ""}
                          {` · ${node.subtreeCount} поз.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-[1.2] flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          value={drafts[node.id] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [node.id]: e.target.value,
                            }))
                          }
                          placeholder="https://… ссылка на фото"
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <input
                            ref={(el) => {
                              fileRefs.current[node.id] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) uploadFile(node.id, f);
                            }}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => fileRefs.current[node.id]?.click()}
                            className="inline-flex items-center gap-1 rounded-xl bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Файл
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              saveImage(
                                node.id,
                                drafts[node.id]?.trim() || null
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Фото
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => saveImage(node.id, null)}
                            title="Вернуть стандартное фото"
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Сброс
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openCreate(node.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-800 hover:bg-green-100"
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                          Подкатегория
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(node)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Имя
                        </button>
                        {node.published ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPublished(node, false)}
                            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Скрыть
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setPublished(node, true)}
                            className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-800 hover:bg-green-100 disabled:opacity-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            На сайт
                          </button>
                        )}
                        {node.subtreeCount === 0 ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeNode(node)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {busy ? (
                    <p className="mt-1 pl-10 text-xs text-slate-400">
                      Сохранение…
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function isVisible(
  roots: CatNode[],
  id: string,
  open: Set<string>
): boolean {
  function walk(nodes: CatNode[], ancestorsOpen: boolean): boolean | null {
    for (const n of nodes) {
      if (n.id === id) return ancestorsOpen;
      const child = walk(n.children, ancestorsOpen && open.has(n.id));
      if (child !== null) return child;
    }
    return null;
  }
  return walk(roots, true) === true;
}
