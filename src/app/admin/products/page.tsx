"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  X,
  Save,
  Upload,
} from "lucide-react";
import { AdminShell, useAdminKey } from "@/components/admin/AdminGate";
import { CategoryPicker } from "@/components/admin/CategoryPicker";

type CatTreeNode = {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  productCount: number;
  subtreeCount: number;
  children: CatTreeNode[];
};

type ProductRow = {
  id: string;
  slug: string;
  sku: string | null;
  nameRu: string;
  nameEn: string;
  published: boolean;
  featured: boolean;
  source: string;
  priceOnRequest?: boolean;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  category: { id: string; slug: string; nameRu: string };
  manufacturer: { id: string; name: string } | null;
  images: { url: string }[];
};

type SpecRow = {
  labelRu: string;
  labelEn: string;
  valueRu: string;
  valueEn: string;
};

const emptyForm = {
  nameRu: "",
  nameEn: "",
  sku: "",
  model: "",
  shortRu: "",
  shortEn: "",
  descriptionRu: "",
  descriptionEn: "",
  categoryId: "",
  manufacturerName: "",
  imageUrl: "",
  published: true,
  featured: false,
  priceOnRequest: true,
  priceAmount: "",
  priceCurrency: "USD",
  specifications: [] as SpecRow[],
};

export default function AdminProductsPage() {
  const gate = useAdminKey();
  const [tree, setTree] = useState<CatTreeNode[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminKey = gate.adminKey;
  const unlocked = gate.unlocked;

  async function uploadPhotoFile(file: File) {
    if (!adminKey) {
      setErr("Сначала войдите в админку (ADMIN_KEY)");
      return;
    }
    const okTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (file.type && !okTypes.includes(file.type)) {
      setErr("Нужен файл JPG, PNG, WEBP или GIF (не HEIC)");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr("Файл больше 4 МБ — сожмите фото или вставьте ссылку");
      return;
    }
    setUploading(true);
    setErr("");
    setMsg("");
    try {
      const body = new FormData();
      body.append("file", file, file.name || "photo.jpg");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          data.error ||
            `Не удалось загрузить фото (код ${res.status})`
        );
        return;
      }
      if (!data.url) {
        setErr("Сервер не вернул URL фото");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url }));
      setMsg("Фото загружено");
    } catch (e) {
      setErr(
        `Ошибка загрузки фото: ${e instanceof Error ? e.message : "сеть / таймаут"}`
      );
    } finally {
      setUploading(false);
    }
  }

  const loadCats = useCallback(async () => {
    if (!unlocked || !adminKey) return;
    const res = await fetch("/api/admin/categories", {
      headers: { "x-admin-key": adminKey },
    });
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      return;
    }
    const data = await res.json();
    setTree(data.tree || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, adminKey]);

  const loadProducts = useCallback(async () => {
    if (!unlocked || !adminKey) return;
    setLoading(true);
    setErr("");
    const params = new URLSearchParams({
      page: String(page),
      perPage: "50",
    });
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    const res = await fetch(`/api/admin/products?${params}`, {
      headers: { "x-admin-key": adminKey },
    });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) gate.lock();
      setErr("Ошибка загрузки товаров");
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, adminKey, page, q, categoryId]);

  useEffect(() => {
    if (unlocked) {
      loadCats();
      loadProducts();
    }
  }, [unlocked, loadCats, loadProducts]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(qInput);
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: "",
    });
    setEditorOpen(true);
    setMsg("");
    setErr("");
  }

  async function openEdit(id: string) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/products/${id}`, {
      headers: gate.headers(false),
    });
    if (!res.ok) {
      setErr("Не удалось открыть товар");
      return;
    }
    const { product } = await res.json();
    setEditingId(product.id);
    setForm({
      nameRu: product.nameRu || "",
      nameEn: product.nameEn || "",
      sku: product.sku || "",
      model: product.model || "",
      shortRu: product.shortRu || "",
      shortEn: product.shortEn || "",
      descriptionRu: product.descriptionRu || "",
      descriptionEn: product.descriptionEn || "",
      categoryId: product.categoryId || product.category?.id || "",
      manufacturerName: product.manufacturer?.name || "",
      imageUrl: product.images?.[0]?.url || "",
      published: !!product.published,
      featured: !!product.featured,
      priceOnRequest: product.priceOnRequest !== false,
      priceAmount: product.priceAmount || "",
      priceCurrency: product.priceCurrency || "USD",
      specifications: (product.specifications || []).map(
        (s: {
          labelRu: string;
          labelEn: string;
          valueRu: string;
          valueEn: string;
        }) => ({
          labelRu: s.labelRu,
          labelEn: s.labelEn,
          valueRu: s.valueRu,
          valueEn: s.valueEn,
        })
      ),
    });
    setEditorOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form.nameRu.trim() || !form.categoryId) {
      setErr("Укажите название и категорию");
      return;
    }
    if (!form.priceOnRequest && !form.priceAmount.trim()) {
      setErr("Укажите цену или включите «цена по запросу»");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    const payload = {
      nameRu: form.nameRu.trim(),
      nameEn: form.nameEn.trim() || form.nameRu.trim(),
      sku: form.sku.trim() || null,
      model: form.model.trim() || null,
      shortRu: form.shortRu.trim() || null,
      shortEn: form.shortEn.trim() || null,
      descriptionRu: form.descriptionRu.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      categoryId: form.categoryId,
      manufacturerName: form.manufacturerName.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      published: form.published,
      featured: form.featured,
      priceOnRequest: form.priceOnRequest,
      priceAmount: form.priceAmount.trim() || null,
      priceCurrency: form.priceCurrency,
      specifications: form.specifications.filter(
        (s) => s.labelRu.trim() && s.valueRu.trim()
      ),
    };

    const res = await fetch(
      editingId ? `/api/admin/products/${editingId}` : "/api/admin/products",
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
    setMsg(editingId ? "Товар обновлён" : "Товар добавлен");
    setEditorOpen(false);
    loadProducts();
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Удалить товар «${name}»?`)) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
      headers: gate.headers(false),
    });
    if (!res.ok) {
      setErr("Не удалось удалить");
      return;
    }
    setMsg("Удалено");
    loadProducts();
  }

  function addSpec() {
    setForm((f) => ({
      ...f,
      specifications: [
        ...f.specifications,
        { labelRu: "", labelEn: "", valueRu: "", valueEn: "" },
      ],
    }));
  }

  return (
    <AdminShell title="Товары каталога" tab="products" gate={gate}>
      {!gate.unlocked ? null : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Каталог как на сайте. В списке — все существующие товары
              (реагенты, лабораторное оборудование и остальные разделы).{" "}
              Сейчас: <strong className="text-slate-800">{total}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadProducts()}
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
                Добавить товар
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_minmax(280px,420px)]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Поиск товара: название, артикул, бренд…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
              />
            </div>
            {tree.length > 0 ? (
              <CategoryPicker
                tree={tree}
                value={categoryId}
                allowEmpty
                emptyLabel="Все каталоги"
                label="Фильтр по каталогу / подкаталогу"
                onChange={(id) => {
                  setPage(1);
                  setCategoryId(id);
                }}
              />
            ) : null}
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
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <Package className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">Товаров не найдено</p>
              <button
                type="button"
                onClick={openCreate}
                className="btn mt-4 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white"
              >
                Добавить первый товар
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Товар</th>
                      <th className="px-3 py-2.5 font-bold">Категория</th>
                      <th className="px-3 py-2.5 font-bold">Артикул</th>
                      <th className="px-3 py-2.5 font-bold">Статус</th>
                      <th className="px-3 py-2.5 font-bold">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {p.images[0]?.url ? (
                                <Image
                                  src={p.images[0].url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-300">
                                  —
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900">
                                {p.nameRu}
                              </p>
                              <p className="text-xs text-slate-400">
                                {p.manufacturer?.name || "—"} · {p.source}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {p.category?.nameRu || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-green-800">
                          {p.sku || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.published
                                  ? "bg-green-50 text-green-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {p.published ? "Опубликован" : "Скрыт"}
                            </span>
                            {p.featured && (
                              <span className="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Избранный
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700"
                              title="Редактировать"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/ru/product/${p.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700"
                              title="Открыть на сайте"
                            >
                              <Package className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => onDelete(p.id, p.nameRu)}
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
              {pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Назад
                  </button>
                  <span className="text-slate-500">
                    Стр. {page} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Далее
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Editor modal */}
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
                    {editingId ? "Редактировать товар" : "Новый товар"}
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Название (RU) *"
                      value={form.nameRu}
                      onChange={(v) => setForm((f) => ({ ...f, nameRu: v }))}
                      required
                    />
                    <Field
                      label="Название (EN)"
                      value={form.nameEn}
                      onChange={(v) => setForm((f) => ({ ...f, nameEn: v }))}
                    />
                  </div>

                  <CategoryPicker
                    tree={tree}
                    value={form.categoryId}
                    label="Категория / подкатегория *"
                    onChange={(id) =>
                      setForm((f) => ({ ...f, categoryId: id }))
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Артикул (SKU)"
                      value={form.sku}
                      onChange={(v) => setForm((f) => ({ ...f, sku: v }))}
                    />
                    <Field
                      label="Модель"
                      value={form.model}
                      onChange={(v) => setForm((f) => ({ ...f, model: v }))}
                    />
                    <Field
                      label="Бренд / производитель"
                      value={form.manufacturerName}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, manufacturerName: v }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="block text-xs font-bold uppercase text-slate-400">
                      Фото товара
                    </p>
                    <p className="text-[12px] leading-relaxed text-slate-500">
                      Надёжный способ — ссылка. Залейте картинку на{" "}
                      <a
                        href="https://imgbb.com"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-green-700 underline"
                      >
                        imgbb.com
                      </a>{" "}
                      или{" "}
                      <a
                        href="https://postimages.org"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-green-700 underline"
                      >
                        postimages.org
                      </a>
                      , нажмите Copy / Direct link и вставьте сюда. Подойдёт
                      любой прямой URL (jpg/png), в том числе Google Drive.
                    </p>
                    <Field
                      label="Ссылка на фото"
                      value={form.imageUrl}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, imageUrl: v.trim() }))
                      }
                      placeholder="https://i.ibb.co/…/photo.jpg"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                        className="sr-only"
                        tabIndex={-1}
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void uploadPhotoFile(file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? "Загрузка в облако…" : "Или загрузить файл"}
                      </button>
                      <span className="text-xs text-slate-400">
                        JPG / PNG / WEBP / GIF · до 4 МБ
                      </span>
                    </div>
                    {form.imageUrl && (
                      <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <Field
                    label="Краткое описание (RU)"
                    value={form.shortRu}
                    onChange={(v) => setForm((f) => ({ ...f, shortRu: v }))}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                      Полное описание (RU)
                    </label>
                    <textarea
                      value={form.descriptionRu}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          descriptionRu: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-bold uppercase text-slate-400">
                      Цена
                    </p>
                    <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.priceOnRequest}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            priceOnRequest: e.target.checked,
                          }))
                        }
                        className="accent-green-700"
                      />
                      Цена по запросу (кнопка заявки всегда есть)
                    </label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <Field
                        label={
                          form.priceOnRequest
                            ? "Ориентир (необязательно)"
                            : "Сумма *"
                        }
                        value={form.priceAmount}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, priceAmount: v }))
                        }
                        placeholder="1250"
                      />
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                          Валюта
                        </label>
                        <select
                          value={form.priceCurrency}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              priceCurrency: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        >
                          <option value="USD">USD</option>
                          <option value="TJS">TJS</option>
                          <option value="EUR">EUR</option>
                          <option value="RUB">RUB</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            published: e.target.checked,
                          }))
                        }
                        className="accent-green-700"
                      />
                      Опубликован
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            featured: e.target.checked,
                          }))
                        }
                        className="accent-green-700"
                      />
                      Избранный (на главной)
                    </label>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Характеристики
                      </p>
                      <button
                        type="button"
                        onClick={addSpec}
                        className="text-xs font-bold text-green-700 hover:underline"
                      >
                        + добавить
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.specifications.map((s, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <input
                            value={s.labelRu}
                            onChange={(e) => {
                              const specifications = [...form.specifications];
                              specifications[i] = {
                                ...specifications[i],
                                labelRu: e.target.value,
                                labelEn: e.target.value,
                              };
                              setForm((f) => ({ ...f, specifications }));
                            }}
                            placeholder="Параметр"
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                          <div className="flex gap-1">
                            <input
                              value={s.valueRu}
                              onChange={(e) => {
                                const specifications = [...form.specifications];
                                specifications[i] = {
                                  ...specifications[i],
                                  valueRu: e.target.value,
                                  valueEn: e.target.value,
                                };
                                setForm((f) => ({ ...f, specifications }));
                              }}
                              placeholder="Значение"
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  specifications: f.specifications.filter(
                                    (_, j) => j !== i
                                  ),
                                }))
                              }
                              className="rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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

          <p className="mt-6 text-xs text-slate-400">
            В таблице видны товары из всех каталогов (seed, vector-best,
            medtech и добавленные вручную). Фильтр по разделу включает все
            вложенные подкатегории.
          </p>
        </>
      )}
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
      />
    </div>
  );
}
