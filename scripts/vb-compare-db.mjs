import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace(
  /[?&]sslmode=[^&]+/g,
  ""
);
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 15000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const json = JSON.parse(
  fs.readFileSync(path.join(root, "data", "vector-best-products.json"), "utf8")
);

const products = await prisma.product.findMany({
  select: {
    sku: true,
    slug: true,
    source: true,
    nameRu: true,
    manufacturer: { select: { name: true } },
    category: { select: { slug: true, nameRu: true } },
  },
});

const vbDb = products.filter(
  (p) =>
    p.source === "vector-best" ||
    (p.sku && /^[A-Z]-\d+/i.test(p.sku)) ||
    (p.manufacturer?.name || "").toLowerCase().includes("vector") ||
    (p.slug || "").startsWith("vb-")
);

const jsonSkus = new Set(json.map((p) => String(p.sku || "").toUpperCase()).filter(Boolean));
const dbSkus = new Set(vbDb.map((p) => String(p.sku || "").toUpperCase()).filter(Boolean));

const bySource = {};
for (const p of products) {
  bySource[p.source || "?"] = (bySource[p.source || "?"] || 0) + 1;
}
const byCat = {};
for (const p of vbDb) {
  const k = p.category?.nameRu || "?";
  byCat[k] = (byCat[k] || 0) + 1;
}

console.log("DB total products", products.length);
console.log("DB by source", bySource);
console.log("DB vector-like", vbDb.length);
console.log("JSON scraped", json.length, "skus", jsonSkus.size);
console.log("JSON SKUs already in DB", [...jsonSkus].filter((s) => dbSkus.has(s)).length);
console.log("JSON SKUs missing from DB", [...jsonSkus].filter((s) => !dbSkus.has(s)).length);
console.log("VB DB cats", byCat);

await prisma.$disconnect();
await pool.end();
