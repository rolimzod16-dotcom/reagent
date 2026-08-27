/**
 * Restore the 667 ThreeLab products deleted from the 1283 of 2026-08-27.
 * Does NOT import the rest of the 6500 scrape.
 */
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
  connectionTimeoutMillis: 20000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const IN = path.join(root, "data", "threelab-lab.json");
const STATE = path.join(root, "data", "threelab-lab-state.json");
const NEED = 174;

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
function titleRu(s) {
  return s.replace(/^\S/, (c) => c.toUpperCase());
}
function safeImage(u) {
  if (!u) return null;
  const low = String(u).toLowerCase();
  if (!low.includes("threelab.ru/upload/iblock/")) return null;
  if (/logo|watermark|banner|favicon|sprite|placeholder/i.test(low)) return null;
  return u;
}
function pathSegs(categoryPath) {
  const drop = new Set([
    "catalog",
    "laboratornoe-oborudovanie",
    "laboratornaya-posuda",
  ]);
  return String(categoryPath || "")
    .split("/")
    .filter((p) => p && !drop.has(p))
    .slice(0, 3);
}

let labels = {};
if (fs.existsSync(STATE)) {
  try {
    labels = JSON.parse(fs.readFileSync(STATE, "utf8")).labels || {};
  } catch {
    /* ignore */
  }
}

async function ensurePath(rootId, prefix, segs, categoryPath) {
  let parentId = rootId;
  const built = [];
  const pathParts = String(categoryPath || "")
    .split("/")
    .filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    built.push(seg);
    const slug = `${prefix}-${slugify(built.join("-"))}`.slice(0, 80);
    let cat = await prisma.category.findUnique({ where: { slug } });
    const catUrl = "/" + pathParts.slice(0, 2 + i + 1).join("/") + "/";
    const nameRu =
      labels[catUrl] || titleRu(seg.replace(/-/g, " ").replace(/\d+$/g, "").trim());
    if (!cat) {
      try {
        cat = await prisma.category.create({
          data: {
            slug,
            nameRu,
            nameEn: nameRu,
            parentId,
            published: true,
            sortOrder: 20,
          },
        });
      } catch {
        cat = await prisma.category.findUnique({ where: { slug } });
      }
    } else if (!cat.published || cat.parentId !== parentId) {
      cat = await prisma.category.update({
        where: { id: cat.id },
        data: { published: true, parentId },
      });
    }
    parentId = cat.id;
  }
  return parentId;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(IN, "utf8"));
  const labRoot = await prisma.category.findFirst({
    where: { slug: "laboratoriya" },
  });
  const consRoot = await prisma.category.findFirst({
    where: { slug: "raskhodniki_meditsinskie" },
  });
  let mfr = await prisma.manufacturer.findFirst({
    where: { name: "REAGENT Partner" },
  });
  if (!mfr) throw new Error("no manufacturer");

  const existing = await prisma.product.findMany({
    select: { id: true, nameRu: true, slug: true },
  });
  const byName = new Map(existing.map((p) => [normName(p.nameRu), p]));
  const slugSet = new Set(existing.map((p) => p.slug));
  const catCache = new Map();

  async function catIdFor(p) {
    const pillar = p.pillar === "consumables" ? "consumables" : "equipment";
    const segs = pathSegs(p.categoryPath || p.path);
    const prefix = pillar === "consumables" ? "cons" : "lab";
    const rootId = pillar === "consumables" ? consRoot.id : labRoot.id;
    const key = prefix + ":" + segs.join("/");
    if (catCache.has(key)) return catCache.get(key);
    const id = segs.length
      ? await ensurePath(rootId, prefix, segs, p.categoryPath || p.path)
      : rootId;
    catCache.set(key, id);
    return id;
  }

  const missing = [];
  for (const p of items) {
    const nameRu = (p.nameRu || "").trim();
    if (!nameRu) continue;
    if (byName.has(normName(nameRu))) continue;
    missing.push(p);
    if (missing.length >= NEED) break;
  }
  console.log("to restore", missing.length);

  let added = 0;
  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const nameRu = p.nameRu.trim();
    let slug = (
      p.slug && p.slug.startsWith("tl-") ? p.slug : `tl-${slugify(nameRu)}`
    ).slice(0, 80);
    if (slugSet.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    const img = safeImage(p.image);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const categoryId = await catIdFor(p);
        await prisma.product.create({
          data: {
            slug,
            nameRu,
            nameEn: p.nameEn || nameRu,
            shortRu: nameRu.slice(0, 160),
            shortEn: (p.nameEn || nameRu).slice(0, 160),
            descriptionRu: `${nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
            descriptionEn: `${nameRu}. Supplied via REAGENT (reagent.tj). Price on request.`,
            published: true,
            featured: false,
            priceOnRequest: true,
            priceAmount: null,
            source: "threelab",
            categoryId,
            manufacturerId: mfr.id,
            images: img
              ? {
                  create: [
                    {
                      url: img,
                      altRu: nameRu,
                      altEn: nameRu,
                      sortOrder: 0,
                    },
                  ],
                }
              : undefined,
          },
        });
        slugSet.add(slug);
        byName.set(normName(nameRu), { slug });
        added++;
        break;
      } catch (e) {
        const msg = String(e.message || e);
        if (
          /not queryable|terminated|timeout|ECONN|P1001|Can't reach/i.test(msg) &&
          attempt < 3
        ) {
          console.warn("retry", i, msg.slice(0, 60));
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        console.warn("fail", nameRu.slice(0, 40), msg.slice(0, 80));
        break;
      }
    }
    if (i && i % 40 === 0) {
      console.log("restored", added, "/", missing.length);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const prochee = await prisma.category.findUnique({
    where: { slug: "lab-prochee" },
  });
  if (prochee) {
    const parked = await prisma.product.findMany({
      where: { categoryId: prochee.id },
      select: { id: true, nameRu: true },
    });
    const jsonByName = new Map(
      items.map((p) => [normName(p.nameRu), p]).filter(([k]) => k)
    );
    let back = 0;
    for (const row of parked) {
      const src = jsonByName.get(normName(row.nameRu));
      if (!src) continue;
      try {
        const categoryId = await catIdFor(src);
        if (categoryId !== prochee.id) {
          await prisma.product.update({
            where: { id: row.id },
            data: { categoryId },
          });
          back++;
        }
      } catch (e) {
        console.warn("refile fail", e.message);
      }
    }
    console.log("moved back from prochee", back, "/", parked.length);
  }

  const tl = await prisma.product.count({ where: { source: "threelab" } });
  const fresh = await prisma.product.count({
    where: {
      source: "threelab",
      createdAt: { gte: new Date("2026-08-26T00:00:00.000Z") },
    },
  });
  console.log({
    added,
    threelab: tl,
    freshAug27: fresh,
    total: await prisma.product.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
