import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getSupabaseAdmin,
  PRODUCT_IMAGES_BUCKET,
} from "@/lib/supabase-admin";
import { guessMime } from "@/lib/image-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel hobby body limit ~4.5 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function ensureBucket() {
  const sb = getSupabaseAdmin();
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw error;
  const exists = buckets?.some((b) => b.name === PRODUCT_IMAGES_BUCKET);
  if (exists) return;

  const { error: createErr } = await sb.storage.createBucket(
    PRODUCT_IMAGES_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    }
  );
  if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
    throw createErr;
  }
}

async function uploadSupabase(buffer: Buffer, path: string, mime: string) {
  await ensureBucket();
  const sb = getSupabaseAdmin();
  const { error } = await sb.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Supabase не вернул публичный URL");
  return data.publicUrl;
}

/** Anonymous public host — fallback when Supabase storage is blocked. */
async function uploadCatbox(buffer: Buffer, filename: string, mime: string) {
  const form = new FormData();
  form.set("reqtype", "fileupload");
  form.set(
    "fileToUpload",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    filename
  );
  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(text || "Catbox upload failed");
  }
  return text;
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Выберите файл изображения" },
        { status: 400 }
      );
    }

    const mime = guessMime(file);
    if (!mime || !ALLOWED.has(mime)) {
      return NextResponse.json(
        {
          error:
            "Только JPG, PNG, WEBP или GIF. HEIC с iPhone не подходит — сохраните как JPG.",
        },
        { status: 400 }
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Максимум 4 МБ на фото (лимит сервера)" },
        { status: 400 }
      );
    }

    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : "jpg";
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё_-]+/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
    const filename = `${Date.now()}-${safeName || "photo"}.${ext}`;
    const folderRaw = String(form.get("folder") || "products");
    const folder = folderRaw === "categories" ? "categories" : "products";
    const path = `${folder}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let url = "";
    let via = "supabase";
    try {
      url = await uploadSupabase(buffer, path, mime);
    } catch (first) {
      console.error("supabase upload failed, fallback catbox", first);
      via = "catbox";
      url = await uploadCatbox(buffer, filename, mime);
    }

    return NextResponse.json({ url, path, via });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      {
        error:
          "Не удалось загрузить файл. Вставьте прямую ссылку на фото (imgbb.com / postimages.org) или уменьшите файл до 4 МБ. " +
          msg,
      },
      { status: 500 }
    );
  }
}
