/**
 * Import Vector-Best reagents into full category/subcategory tree under reagents.
 * Dedupes by SKU / slug.
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

const IN = path.join(root, "data", "vector-best-products.json");
const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace(
  /[?&]sslmode=[^&]+/g,
  ""
);
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SEGMENT_RU = {
  immunochemistry: "Иммунохимия",
  "immunokhemilyuminestsentnyy-analiz": "Иммунохемилюминесцентный анализ",
  ifa: "ИФА",
  "ekspress-diagnostika": "Экспресс-диагностика",
  nabory: "Наборы",
  ptsr: "ПЦР",
  biokhimiya: "Биохимия",
  gemostaz: "Гемостаз",
  veterinariya: "Ветеринария",
  "gemotransmissivnye-infektsii": "Гемотрансмиссивные инфекции",
  "vich-infektsiya": "ВИЧ-инфекция",
  "virusnye-gepatity-a-b-c-d-g": "Вирусные гепатиты A, B, C, D, G",
  "zabolevaniya-urogenitalnogo-trakta": "Заболевания урогенитального тракта",
  "torch-i-gerpesvirusnye-infektsii": "TORCH и герпесвирусные инфекции",
  "prirodno-ochagovye-infektsii": "Природно-очаговые инфекции",
  mikozy: "Микозы",
  "nozokomialnye-infektsii": "Нозокомиальные инфекции",
  "respiratornye-infektsii": "Респираторные инфекции",
  neyroinfektsii: "Нейроинфекции",
  "zheludochno-kishechnye-infektsii": "Желудочно-кишечные инфекции",
  "parazitarnye-infektsii": "Паразитарные инфекции",
  tuberkulez: "Туберкулез",
  onkologiya: "Онкология",
  "odnonukleotidnye-polimorfizmy-i-mutatsii-v-genakh-cheloveka":
    "Однонуклеотидные полиморфизмы и мутации",
  "transportnye-sredy": "Транспортные среды",
  "nabory-dlya-vydeleniya-nk": "Наборы для выделения НК",
  fermenty: "Ферменты",
  substraty: "Субстраты",
  lipidy: "Липиды",
  elektrolity: "Электролиты",
  "immunoturbidimetriya-spetsificheskie-belki": "Иммунотурбидиметрия",
  "antioksidantnyy-status": "Антиоксидантный статус",
  kalibratory: "Калибраторы",
  "kontrolnye-materialy": "Контрольные материалы",
  "obshchaya-fasovka": "Общая фасовка",
  "kalibratory-i-kontrolnye-materialy": "Калибраторы и контрольные материалы",
  "nabory-reagentov-dlya-analizatora-hematite": "Наборы для HEMATITE",
  "nabory-dlya-analizatorov-serii-ultima": "Наборы для анализаторов Ультима",
  "parazitanye-invazii": "Паразитарные инвазии",
};

const SLUG_LABELS = {
  "vb-immunochemistry-ifa-nabory": { ru: "ИФА-наборы", en: "ELISA kits" },
  "vb-immunochemistry-immunokhemilyuminestsentnyy-analiz-nabory": {
    ru: "ИХЛА-наборы",
    en: "CLIA kits",
  },
  "vb-immunochemistry-ekspress-diagnostika-nabory": {
    ru: "Экспресс-наборы",
    en: "Rapid tests",
  },
  "vb-ptsr-zbm": { ru: "Прочие ПЦР-наборы", en: "Other PCR kits" },
};

function segName(seg) {
  if (SEGMENT_RU[seg]) return SEGMENT_RU[seg];
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function asciiSlug(parts) {
  return (
    "vb-" +
    parts
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70)
  );
}

async function ensureReagentsRoot() {
  let root = await prisma.category.findFirst({
    where: {
      OR: [{ slug: "reagents" }, { slug: "reagenty" }, { nameRu: "Реагенты" }],
      parentId: null,
    },
  });
  if (!root) {
    root = await prisma.category.create({
      data: {
        slug: "reagents",
        nameRu: "Реагенты",
        nameEn: "Reagents",
        published: true,
        sortOrder: 3,
      },
    });
  }
  return root;
}

/** Ensure full path under reagents: vb-immunochemistry / vb-… */
async function ensurePath(reagentsRootId, categoryPath, cache) {
  const parts = String(categoryPath)
    .split("/")
    .filter((p) => p && p !== "catalog");
  if (!parts.length) return reagentsRootId;

  let parentId = reagentsRootId;
  const built = [];
  for (const seg of parts) {
    built.push(seg);
    const key = built.join("/");
    if (cache.has(key)) {
      parentId = cache.get(key);
      continue;
    }
    const slug = asciiSlug(built);
    let cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      const nameRu = segName(seg);
      try {
        cat = await prisma.category.create({
          data: {
            slug,
            nameRu,
            nameEn: nameRu,
            parentId,
            published: true,
            sortOrder: 10,
          },
        });
      } catch {
        cat = await prisma.category.findUnique({ where: { slug } });
      }
    }
    if (!cat) throw new Error("failed cat " + slug);
    const forced = SLUG_LABELS[slug];
    if (forced && cat.nameRu !== forced.ru) {
      cat = await prisma.category.update({
        where: { id: cat.id },
        data: { nameRu: forced.ru, nameEn: forced.en },
      });
    }
    cache.set(key, cat.id);
    parentId = cat.id;
  }
  return parentId;
}

async function ensureManufacturer() {
  let m = await prisma.manufacturer.findFirst({
    where: { OR: [{ name: "Vector-Best" }, { slug: { contains: "vector" } }] },
  });
  if (m) return m.id;
  // brand shown as partner line on site; manufacturer name without legal clutter
  m = await prisma.manufacturer.create({
    data: {
      slug: `vector-best-${Math.random().toString(36).slice(2, 5)}`,
      name: "Vector-Best",
      descriptionRu: "Партнёрский каталог реагентов",
      descriptionEn: "Partner reagents catalog",
      published: true,
    },
  });
  return m.id;
}

async function main() {
  if (!fs.existsSync(IN)) throw new Error("Missing " + IN);
  const items = JSON.parse(fs.readFileSync(IN, "utf8"));
  console.log("VB products in JSON:", items.length);

  const reagentsRoot = await ensureReagentsRoot();
  const mfrId = await ensureManufacturer();
  const catCache = new Map();

  const existing = await prisma.product.findMany({
    select: { id: true, slug: true, sku: true },
  });
  const bySku = new Map(
    existing.filter((p) => p.sku).map((p) => [p.sku.toUpperCase(), p])
  );
  const bySlug = new Map(existing.map((p) => [p.slug, p]));

  let added = 0;
  let updated = 0;
  let i = 0;
  for (const p of items) {
    i++;
    if (!p.sku || !p.nameRu) continue;
    const sku = String(p.sku).toUpperCase();
    const slug =
      p.slug ||
      `vb-${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 80);
    const categoryId = await ensurePath(
      reagentsRoot.id,
      p.categoryPath || `/catalog/${p.rootSlug || "immunochemistry"}/`,
      catCache
    );

    const data = {
      sku,
      model: sku,
      nameRu: p.nameRu,
      nameEn: p.nameEn || p.nameRu,
      shortRu: (p.descriptionRu || p.nameRu).slice(0, 180),
      shortEn: (p.descriptionEn || p.nameEn || p.nameRu).slice(0, 180),
      descriptionRu:
        p.descriptionRu ||
        `${p.nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
      descriptionEn:
        p.descriptionEn ||
        `${p.nameRu}. Supplied via REAGENT. Price on request.`,
      published: true,
      featured: false,
      source: "vector-best",
      categoryId,
      manufacturerId: mfrId,
    };

    const hit = bySku.get(sku) || bySlug.get(slug);
    try {
      if (hit) {
        await prisma.product.update({
          where: { id: hit.id },
          data: {
            ...data,
            // keep featured if already set (e.g. EHBT)
          },
        });
        // refresh primary image if missing
        const imgCount = await prisma.productImage.count({
          where: { productId: hit.id },
        });
        if (!imgCount && p.image) {
          await prisma.productImage.create({
            data: {
              productId: hit.id,
              url: p.image,
              altRu: p.nameRu,
              altEn: p.nameEn || p.nameRu,
              sortOrder: 0,
            },
          });
        }
        updated++;
      } else {
        const created = await prisma.product.create({
          data: {
            slug,
            ...data,
            images: p.image
              ? {
                  create: [
                    {
                      url: p.image,
                      altRu: p.nameRu,
                      altEn: p.nameEn || p.nameRu,
                      sortOrder: 0,
                    },
                  ],
                }
              : undefined,
          },
        });
        bySku.set(sku, created);
        bySlug.set(slug, created);
        added++;
      }
    } catch (e) {
      console.warn("fail", sku, e.message);
    }
    if (i % 100 === 0) {
      console.log(`progress ${i}/${items.length} +${added} ~${updated}`);
    }
  }

  console.log(
    "DONE added=",
    added,
    "updated=",
    updated,
    "products=",
    await prisma.product.count(),
    "vb cats=",
    await prisma.category.count({ where: { slug: { startsWith: "vb-" } } })
  );
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
