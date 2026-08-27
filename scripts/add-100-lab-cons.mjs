/**
 * Add ~100 unused ThreeLab products to lab equipment and ~100 to consumables.
 * Never update existing products. Price on request.
 */
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
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
  connectionTimeoutMillis: 20000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/ж/g, "zh")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "ts")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ъ|ь/g, "")
    .replace(/ы/g, "y")
    .replace(/э/g, "e")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function safeImage(u) {
  if (!u) return null;
  const low = String(u).toLowerCase();
  if (!low.includes("threelab.ru/upload/iblock/")) return null;
  if (/logo|watermark|banner|favicon|sprite/i.test(low)) return null;
  return u;
}
function pathSegs(categoryPath, drop) {
  return String(categoryPath || "")
    .split("/")
    .filter((p) => p && !drop.has(p))
    .slice(0, 3);
}

async function addBucket(opts) {
  const { items, prefix, drop, catBySlug, byName, slugSet, mfrId, limit, perCat } =
    opts;
  const picked = [];
  const used = {};
  for (const p of items) {
    const nameRu = (p.nameRu || "").trim();
    if (!nameRu || byName.has(normName(nameRu))) continue;
    const segs = pathSegs(p.categoryPath || p.path, drop);
    if (!segs.length) continue;
    let cat = null;
    for (let n = segs.length; n >= 1; n--) {
      const slug = `${prefix}-${slugify(segs.slice(0, n).join("-"))}`.slice(0, 80);
      if (catBySlug.has(slug)) {
        cat = catBySlug.get(slug);
        break;
      }
    }
    if (!cat) continue;
    used[cat.id] = used[cat.id] || 0;
    if (used[cat.id] >= perCat) continue;
    used[cat.id]++;
    picked.push({ p, nameRu, cat, img: safeImage(p.image) });
    if (picked.length >= limit) break;
  }
  console.log("picked", prefix, picked.length);

  let added = 0;
  for (const row of picked) {
    let slug = (
      row.p.slug && String(row.p.slug).startsWith("tl-")
        ? row.p.slug
        : `tl-${slugify(row.nameRu)}`
    ).slice(0, 80);
    if (slugSet.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    try {
      await prisma.product.create({
        data: {
          slug,
          nameRu: row.nameRu,
          nameEn: row.p.nameEn || row.nameRu,
          shortRu: row.nameRu.slice(0, 160),
          shortEn: (row.p.nameEn || row.nameRu).slice(0, 160),
          descriptionRu: `${row.nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
          descriptionEn: `${row.nameRu}. Supplied via REAGENT. Price on request.`,
          published: true,
          featured: false,
          priceOnRequest: true,
          priceAmount: null,
          source: "threelab",
          categoryId: row.cat.id,
          manufacturerId: mfrId,
          images: row.img
            ? {
                create: [
                  {
                    url: row.img,
                    altRu: row.nameRu,
                    altEn: row.nameRu,
                    sortOrder: 0,
                  },
                ],
              }
            : undefined,
        },
      });
      slugSet.add(slug);
      byName.set(normName(row.nameRu), true);
      added++;
    } catch (e) {
      console.warn("skip", row.nameRu.slice(0, 40), String(e.message).slice(0, 60));
    }
    if (added && added % 25 === 0) {
      console.log(prefix, "added", added);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return added;
}

const json = JSON.parse(fs.readFileSync("data/threelab-lab.json", "utf8"));
const cats = await prisma.category.findMany({
  select: { id: true, slug: true },
});
const catBySlug = new Map(cats.map((c) => [c.slug, c]));
const existing = await prisma.product.findMany({
  select: { nameRu: true, slug: true },
});
const byName = new Map(existing.map((p) => [normName(p.nameRu), true]));
const slugSet = new Set(existing.map((p) => p.slug));
const mfr = await prisma.manufacturer.findFirst({
  where: { name: "REAGENT Partner" },
});

const labAdded = await addBucket({
  items: json.filter((p) => p.pillar !== "consumables"),
  prefix: "lab",
  drop: new Set(["catalog", "laboratornoe-oborudovanie", "laboratornaya-posuda"]),
  catBySlug,
  byName,
  slugSet,
  mfrId: mfr.id,
  limit: 100,
  perCat: 8,
});
const consAdded = await addBucket({
  items: json.filter((p) => p.pillar === "consumables"),
  prefix: "cons",
  drop: new Set(["catalog", "laboratornoe-oborudovanie", "laboratornaya-posuda"]),
  catBySlug,
  byName,
  slugSet,
  mfrId: mfr.id,
  limit: 100,
  perCat: 12,
});

console.log("DONE lab", labAdded, "cons", consAdded, "total", await prisma.product.count());
await prisma.$disconnect();
await pool.end();
