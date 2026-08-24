/**
 * Import scraped threelab equipment into Supabase with dedupe.
 * Dedupe keys: source path, slug, sku, normalized nameRu.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const IN = path.join(root, "data", "threelab-equipment.json");
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: url?.replace(/[?&]sslmode=[^&]+/g, ""),
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

async function ensureEquipmentRoot() {
  let rootCat = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: "oborudovanie_diagnosticheskoe" },
        { slug: "laboratoriya" },
        { slug: "equipment" },
      ],
    },
  });
  if (!rootCat) {
    rootCat = await prisma.category.findFirst({
      where: { parentId: null, published: true },
    });
  }
  if (!rootCat) throw new Error("No root category");

  let tl = await prisma.category.findUnique({
    where: { slug: "threelab-equipment" },
  });
  if (tl && tl.nameRu === "Лабораторное оборудование") {
    tl = await prisma.category.update({
      where: { id: tl.id },
      data: {
        nameRu: "Лабораторные приборы",
        nameEn: "Laboratory instruments",
      },
    });
  }
  if (!tl) {
    tl = await prisma.category.create({
      data: {
        slug: "threelab-equipment",
        nameRu: "Лабораторные приборы",
        nameEn: "Laboratory instruments",
        descriptionRu: "Импорт лабораторного оборудования",
        descriptionEn: "Imported laboratory equipment",
        parentId: rootCat.id,
        sortOrder: 50,
        published: true,
      },
    });
  }
  return tl;
}

async function ensureLeafCategory(parentId, categoryPath) {
  const seg =
    categoryPath
      .replace(/\/$/, "")
      .split("/")
      .filter(Boolean)
      .slice(2) // drop catalog, laboratornoe-oborudovanie
      .pop() || "other";
  const slug = `tl-${slugify(seg)}`.slice(0, 80);
  if (slug === "tl-other") {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    return parent;
  }
  let cat = await prisma.category.findUnique({ where: { slug } });
  if (cat) return cat;
  const nameRu = seg.replace(/-/g, " ");
  try {
    cat = await prisma.category.create({
      data: {
        slug,
        nameRu: nameRu.charAt(0).toUpperCase() + nameRu.slice(1),
        nameEn: nameRu,
        parentId,
        published: true,
        sortOrder: 100,
      },
    });
  } catch {
    cat = await prisma.category.findUnique({ where: { slug } });
  }
  return cat;
}

async function upsertManufacturer(name) {
  const n = (name || "REAGENT Partner").trim();
  let m = await prisma.manufacturer.findFirst({ where: { name: n } });
  if (m) return m.id;
  m = await prisma.manufacturer.create({
    data: {
      slug: `${slugify(n)}-${Math.random().toString(36).slice(2, 5)}`,
      name: n,
      published: true,
    },
  });
  return m.id;
}

async function main() {
  if (!fs.existsSync(IN)) throw new Error("Missing " + IN);
  const items = JSON.parse(fs.readFileSync(IN, "utf8"));
  console.log("import candidates", items.length);

  const existing = await prisma.product.findMany({
    select: { slug: true, sku: true, nameRu: true },
  });
  const slugSet = new Set(existing.map((p) => p.slug));
  const skuSet = new Set(
    existing.map((p) => (p.sku || "").toLowerCase()).filter(Boolean)
  );
  const nameSet = new Set(existing.map((p) => normName(p.nameRu)));

  const rootCat = await ensureEquipmentRoot();
  const partnerId = await upsertManufacturer("REAGENT Partner");

  let added = 0;
  let skipped = 0;
  let i = 0;
  for (const p of items) {
    i++;
    const nameRu = (p.nameRu || "").trim();
    if (!nameRu) {
      skipped++;
      continue;
    }
    const nn = normName(nameRu);
    let slug = (p.slug || `tl-${slugify(nameRu)}`).slice(0, 80);
    if (nameSet.has(nn) || slugSet.has(slug)) {
      skipped++;
      continue;
    }
    // collision-safe slug
    if (slugSet.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const leaf = await ensureLeafCategory(rootCat.id, p.categoryPath || "");
    try {
      await prisma.product.create({
        data: {
          slug,
          sku: null,
          model: null,
          nameRu,
          nameEn: p.nameEn || nameRu,
          shortRu: nameRu.slice(0, 160),
          shortEn: (p.nameEn || nameRu).slice(0, 160),
          descriptionRu: `${nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
          descriptionEn: `${nameRu}. Supplied via REAGENT (reagent.tj). Price on request.`,
          published: true,
          featured: false,
          source: "threelab",
          categoryId: leaf?.id || rootCat.id,
          manufacturerId: partnerId,
          images: p.image
            ? {
                create: [
                  {
                    url: p.image,
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
      nameSet.add(nn);
      added++;
    } catch (e) {
      skipped++;
      if (i < 20) console.warn("skip", nameRu.slice(0, 40), e.message);
    }
    if (i % 50 === 0) console.log(`progress ${i}/${items.length} added=${added} skipped=${skipped}`);
  }

  console.log("DONE added=", added, "skipped=", skipped, "total now=", await prisma.product.count());
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
