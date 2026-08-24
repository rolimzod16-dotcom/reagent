/**
 * Optional backup of admin-created products (Postgres is source of truth).
 * - Local: data/admin-products.json
 * - Also tries /tmp/admin-products.json
 * Imported by prisma/build-catalog.mjs if slug is missing after seed.
 */
import fs from "fs";
import path from "path";

export type AdminProductRecord = {
  id?: string;
  slug: string;
  sku?: string | null;
  model?: string | null;
  nameRu: string;
  nameEn: string;
  shortRu?: string | null;
  shortEn?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  applicationsRu?: string | null;
  applicationsEn?: string | null;
  published: boolean;
  featured: boolean;
  categorySlug: string;
  manufacturerName?: string | null;
  imageUrl?: string | null;
  specifications?: {
    labelRu: string;
    labelEn: string;
    valueRu: string;
    valueEn: string;
  }[];
  updatedAt?: string;
};

function candidates(): string[] {
  const list = [
    path.join(process.cwd(), "data", "admin-products.json"),
    "/tmp/admin-products.json",
  ];
  return list;
}

export function loadAdminProductRecords(): AdminProductRecord[] {
  const files = [
    path.join(process.cwd(), "data", "admin-products.json"),
    "/tmp/admin-products.json",
  ];
  for (const file of files) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ file)) {
        const raw = JSON.parse(
          fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")
        );
        if (Array.isArray(raw)) return raw;
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function saveAdminProductRecords(records: AdminProductRecord[]) {
  const payload = JSON.stringify(records, null, 2);
  const files = [
    path.join(process.cwd(), "data", "admin-products.json"),
    "/tmp/admin-products.json",
  ];
  let saved = false;
  for (const file of files) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(/* turbopackIgnore: true */ dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(/* turbopackIgnore: true */ file, payload, "utf8");
      saved = true;
    } catch {
      /* read-only FS etc */
    }
  }
  return saved;
}

export function upsertAdminProductRecord(rec: AdminProductRecord) {
  const list = loadAdminProductRecords();
  const idx = list.findIndex(
    (x) => x.slug === rec.slug || (rec.id && x.id === rec.id)
  );
  const next = { ...rec, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = { ...list[idx], ...next };
  else list.push(next);
  saveAdminProductRecords(list);
  return list;
}

export function removeAdminProductRecord(slug: string) {
  const list = loadAdminProductRecords().filter((x) => x.slug !== slug);
  saveAdminProductRecords(list);
  return list;
}
