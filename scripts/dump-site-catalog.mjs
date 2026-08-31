import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!raw) throw new Error("DATABASE_URL is not set");
const connectionString = raw.replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const QTY_LABELS = [
  "количество определений",
  "фасовка",
  "упаковка",
  "объём",
  "объем",
  "фасовка / определений",
];
const REG_LABELS = ["регистрация", "рег. сведения", "ру", "ерул"];

const cats = await prisma.category.findMany({
  select: {
    id: true,
    slug: true,
    nameRu: true,
    parentId: true,
    published: true,
    sortOrder: true,
  },
});
const byId = new Map(cats.map((c) => [c.id, c]));

function chain(id) {
  const names = [];
  const slugs = [];
  const seen = new Set();
  let cur = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.nameRu);
    slugs.unshift(cur.slug);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return {
    rootSlug: slugs[0] || "prochee",
    rootName: names[0] || "Прочее",
    leafName: names[names.length - 1] || "Прочее",
    path: names.join(" / "),
    sortOrder: byId.get(id)?.sortOrder ?? 999,
    rootSort:
      [...byId.values()].find((c) => !c.parentId && c.slug === slugs[0])
        ?.sortOrder ?? 999,
  };
}

function specValue(specs, labels) {
  for (const s of specs) {
    const lab = (s.labelRu || "").trim().toLowerCase();
    if (labels.some((l) => lab === l || lab.includes(l))) {
      const v = (s.valueRu || "").trim();
      if (v) return v;
    }
  }
  return "";
}

const products = await prisma.product.findMany({
  where: { published: true },
  select: {
    sku: true,
    model: true,
    slug: true,
    nameRu: true,
    nameEn: true,
    manufacturer: { select: { name: true } },
    categoryId: true,
    specifications: { select: { labelRu: true, valueRu: true } },
  },
  orderBy: [{ nameRu: "asc" }],
});

const items = products.map((p) => {
  const cat = chain(p.categoryId);
  return {
    sku: (p.sku || "").trim(),
    model: (p.model || "").trim(),
    slug: p.slug,
    nameRu: p.nameRu,
    nameEn: p.nameEn,
    manufacturer: p.manufacturer?.name || "",
    qty: specValue(p.specifications, QTY_LABELS),
    registration: specValue(p.specifications, REG_LABELS),
    ...cat,
  };
});

const byRoot = {};
for (const it of items) {
  byRoot[it.rootName] = (byRoot[it.rootName] || 0) + 1;
}

const out = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  byRoot,
  items,
};

writeFileSync(
  new URL("../data/site-catalog.json", import.meta.url),
  JSON.stringify(out, null, 0),
  "utf8"
);

console.log("wrote data/site-catalog.json");
console.log("products", items.length);
console.log("byRoot", byRoot);

await prisma.$disconnect();
await pool.end();
