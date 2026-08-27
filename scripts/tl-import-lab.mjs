/**
 * Import ThreeLab equipment + consumables under existing roots.
 * Skip already-imported names/slugs. Recategorize existing threelab products.
 * Price on request. Images only from threelab.ru/upload/iblock.
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
  idleTimeoutMillis: 20000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const IN = path.join(root, "data", "threelab-lab.json");
const STATE = path.join(root, "data", "threelab-lab-state.json");

const LABEL_FALLBACK = {
  avtoklavy: "Автоклавы",
  mikroskopy: "Микроскопы",
  tsentrifugi: "Центрифуги",
  mikrotsetrifugi: "Микроцентрифуги",
  "tsentrifugi-vorteksy": "Центрифуги-вортексы",
  vesy: "Весы",
  "rn-metry-ionomery-rn-elektrody": "pH-метры и иономеры",
  meshalki: "Мешалки",
  "laboratornye-inkubatory": "Инкубаторы",
  termostaty: "Термостаты",
  "pipetki-avtomaticheskie": "Автоматические пипетки",
  fotometry: "Фотометры",
  spektrofotometry: "Спектрофотометры",
  "laminarnye-shkafy": "Ламинарные шкафы",
  "shkafy-vytyazhnye": "Вытяжные шкафы",
  "sistemy-ochistki-vody": "Системы очистки воды",
  "distillyatory-bidistillyatory": "Дистилляторы",
  morozilniki: "Морозильники",
  kholodilniki: "Холодильники",
  "sheykery-inkubatory": "Шейкеры-инкубаторы",
  sheykery: "Шейкеры",
  elektroforez: "Электрофорез",
  sterilizatory: "Стерилизаторы",
  bani: "Бани",
  pechi: "Печи",
  "sushilnye-shkafy": "Сушильные шкафы",
  titratory: "Титраторы",
  konduktometry: "Кондуктометры",
  "dnk-amplifikatory": "ДНК-амплификаторы",
  "ptsr-boksy": "ПЦР-боксы",
  gomogenizatory: "Гомогенизаторы",
  nasosy: "Насосы",
  "reaktory-khimicheskie": "Химические реакторы",
  "inkubatory-co": "CO₂-инкубаторы",
  "plastikovaya-posuda": "Пластиковая посуда",
  "steklyannaya-posuda": "Стеклянная посуда",
  "farforovaya-posuda": "Фарфоровая посуда",
  shtativy: "Штативы",
  "sredstva-zashchity1040": "Средства защиты",
  eksikatory: "Эксикаторы",
  dozatory: "Дозаторы",
  pipetatory: "Пипетаторы",
  "nakonechniki-dlya-dozatorov": "Наконечники для дозаторов",
  "tsentrifuzhnye-probirki": "Центрифужные пробирки",
  "probirki-tipa-eppendorf": "Пробирки типа Эппендорф",
  "probirki-stripy-i-planshety-dlya-ptsr": "Пробирки и планшеты для ПЦР",
  "chashki-petri": "Чашки Петри",
  "kulturalnyy-plastik": "Культуральный пластик",
  "krioprobirki": "Криопробирки",
  butyli: "Бутыли",
  kolby: "Колбы",
  stakany: "Стаканы",
  tsilindry: "Цилиндры",
  voronki: "Воронки",
  "serologicheskie-pipetki": "Серологические пипетки",
  "pipetka-pastera": "Пипетки Пастера",
  "konteynery-dlya-obraztsov": "Контейнеры для образцов",
  "konteynery-dlya-khraneniya": "Контейнеры для хранения",
  "pakety-dlya-avtoklavirovaniya": "Пакеты для автоклавирования",
  "meshki-dlya-kultur-kletok": "Мешки для культур клеток",
  "vialy-i-septy": "Виалы и септы",
  "mernaya-posuda": "Мерная посуда",
};

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

function segLabel(seg, labels, catPathBuilt) {
  if (labels[catPathBuilt]) return labels[catPathBuilt];
  if (LABEL_FALLBACK[seg]) return LABEL_FALLBACK[seg];
  return titleRu(seg.replace(/-/g, " ").replace(/\d+$/g, "").trim());
}

function safeImage(u) {
  if (!u) return null;
  const low = String(u).toLowerCase();
  if (!low.includes("threelab.ru/upload/iblock/")) return null;
  if (/logo|watermark|banner|favicon|sprite|placeholder/i.test(low)) return null;
  return u;
}

function pathSegs(categoryPath, pillar) {
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

async function ensureRoot(slug, names) {
  let cat = await prisma.category.findFirst({
    where: { slug, parentId: null },
  });
  if (!cat) {
    cat = await prisma.category.create({
      data: {
        slug,
        nameRu: names.ru,
        nameEn: names.en,
        published: true,
        sortOrder: 10,
      },
    });
  } else if (!cat.published) {
    cat = await prisma.category.update({
      where: { id: cat.id },
      data: { published: true },
    });
  }
  return cat;
}

async function ensurePath(rootId, prefix, segs, labels, categoryPath) {
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
    const catUrl =
      "/" + pathParts.slice(0, 2 + i + 1).join("/") + "/";
    const nameRu = segLabel(seg, labels, catUrl);
    if (!cat) {
      try {
        cat = await prisma.category.create({
          data: {
            slug,
            nameRu,
            nameEn: nameRu,
            parentId,
            published: true,
            sortOrder: 20 + i * 10,
          },
        });
      } catch {
        cat = await prisma.category.findUnique({ where: { slug } });
      }
    } else {
      const patch = {};
      if (!cat.published) patch.published = true;
      if (cat.parentId !== parentId) patch.parentId = parentId;
      if (LABEL_FALLBACK[seg] && cat.nameRu !== LABEL_FALLBACK[seg] && /[A-Za-z]{4,}/.test(cat.nameRu)) {
        patch.nameRu = nameRu;
        patch.nameEn = nameRu;
      }
      if (Object.keys(patch).length) {
        cat = await prisma.category.update({ where: { id: cat.id }, data: patch });
      }
    }
    if (!cat) throw new Error("failed cat " + slug);
    parentId = cat.id;
  }
  return parentId;
}

async function main() {
  if (!fs.existsSync(IN)) throw new Error("Missing " + IN);
  const items = JSON.parse(fs.readFileSync(IN, "utf8"));
  let labels = {};
  if (fs.existsSync(STATE)) {
    try {
      labels = JSON.parse(fs.readFileSync(STATE, "utf8")).labels || {};
    } catch {
      /* ignore */
    }
  }
  console.log("import candidates", items.length, "labels", Object.keys(labels).length);

  const labRoot = await ensureRoot("laboratoriya", {
    ru: "Лабораторное оборудование",
    en: "Laboratory equipment",
  });
  const consRoot = await ensureRoot("raskhodniki_meditsinskie", {
    ru: "Расходники и аксессуары медицинские",
    en: "Medical consumables",
  });

  let mfr = await prisma.manufacturer.findFirst({
    where: { name: "REAGENT Partner" },
  });
  if (!mfr) {
    mfr = await prisma.manufacturer.create({
      data: {
        slug: "reagent-partner-lab",
        name: "REAGENT Partner",
        published: true,
      },
    });
  }

  const existing = await prisma.product.findMany({
    select: { id: true, slug: true, sku: true, nameRu: true, source: true },
  });
  const byName = new Map(existing.map((p) => [normName(p.nameRu), p]));
  const slugSet = new Set(existing.map((p) => p.slug));

  const priced = await prisma.product.updateMany({
    where: { OR: [{ priceOnRequest: false }, { priceAmount: { not: null } }] },
    data: { priceOnRequest: true, priceAmount: null },
  });
  console.log("forced price-on-request", priced.count);

  let added = 0;
  let moved = 0;
  let imaged = 0;
  let skipped = 0;
  const catCache = new Map();
  const haveImg = new Set(
    (
      await prisma.productImage.findMany({
        select: { productId: true },
        distinct: ["productId"],
      })
    ).map((r) => r.productId)
  );

  console.log("ensuring categories…");
  const prepared = [];
  for (const p of items) {
    const nameRu = (p.nameRu || "").trim();
    if (!nameRu) {
      skipped++;
      continue;
    }
    const pillar = p.pillar === "consumables" ? "consumables" : "equipment";
    const segs = pathSegs(p.categoryPath || p.path, pillar);
    const prefix = pillar === "consumables" ? "cons" : "lab";
    const rootId = pillar === "consumables" ? consRoot.id : labRoot.id;
    const cacheKey = prefix + ":" + segs.join("/");
    let categoryId = catCache.get(cacheKey);
    if (!categoryId) {
      categoryId = segs.length
        ? await ensurePath(rootId, prefix, segs, labels, p.categoryPath || p.path)
        : rootId;
      catCache.set(cacheKey, categoryId);
    }
    prepared.push({ p, nameRu, categoryId, img: safeImage(p.image) });
  }
  console.log("cats ready", catCache.size, "rows", prepared.length);

  async function runPool(jobs, n) {
    for (let i = 0; i < jobs.length; i += n) {
      const slice = jobs.slice(i, i + n);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await Promise.all(slice.map((fn) => fn()));
          break;
        } catch (e) {
          const msg = String(e.message || e);
          if (
            !/not queryable|terminated|timeout|ECONN|P1001|Can't reach|not respond/i.test(
              msg
            ) ||
            attempt === 2
          ) {
            throw e;
          }
          console.warn("batch retry", i, msg.slice(0, 70));
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      await new Promise((r) => setTimeout(r, 80));
      if (i && i % 120 === 0) {
        console.log(`progress ${i}/${jobs.length} +${added} moved=${moved} img=${imaged}`);
      }
    }
  }

  const moveJobs = [];
  const createJobs = [];
  for (const row of prepared) {
    const nn = normName(row.nameRu);
    const hit = byName.get(nn);
    if (hit) {
      moveJobs.push(async () => {
        await prisma.product.update({
          where: { id: hit.id },
          data: {
            categoryId: row.categoryId,
            priceOnRequest: true,
            priceAmount: null,
          },
        });
        moved++;
        if (row.img && !haveImg.has(hit.id)) {
          await prisma.productImage.create({
            data: {
              productId: hit.id,
              url: row.img,
              altRu: row.nameRu,
              altEn: row.nameRu,
              sortOrder: 0,
            },
          });
          haveImg.add(hit.id);
          imaged++;
        }
      });
      continue;
    }
    let slug = (
      row.p.slug && row.p.slug.startsWith("tl-")
        ? row.p.slug
        : `tl-${slugify(row.nameRu)}`
    ).slice(0, 80);
    if (slugSet.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    slugSet.add(slug);
    createJobs.push(async () => {
      await prisma.product.create({
        data: {
          slug,
          sku: null,
          model: null,
          nameRu: row.nameRu,
          nameEn: row.p.nameEn || row.nameRu,
          shortRu: row.nameRu.slice(0, 160),
          shortEn: (row.p.nameEn || row.nameRu).slice(0, 160),
          descriptionRu: `${row.nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
          descriptionEn: `${row.nameRu}. Supplied via REAGENT (reagent.tj). Price on request.`,
          published: true,
          featured: false,
          priceOnRequest: true,
          priceAmount: null,
          source: "threelab",
          categoryId: row.categoryId,
          manufacturerId: mfr.id,
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
      added++;
    });
  }

  console.log("move", moveJobs.length, "create", createJobs.length);
  await runPool(moveJobs, 4);
  await runPool(createJobs, 3);

  const dump = await prisma.category.findUnique({
    where: { slug: "threelab-equipment" },
  });
  if (dump) {
    const leftover = await prisma.product.count({ where: { categoryId: dump.id } });
    if (leftover === 0) {
      await prisma.category.update({
        where: { id: dump.id },
        data: { published: false },
      });
      console.log("hid empty threelab-equipment");
    } else {
      console.log("threelab-equipment leftover", leftover);
    }
  }

  const labKids = await prisma.category.findMany({
    where: { parentId: labRoot.id, published: true },
    select: {
      slug: true,
      nameRu: true,
      _count: { select: { products: true, children: true } },
    },
    orderBy: { nameRu: "asc" },
  });
  const consKids = await prisma.category.findMany({
    where: { parentId: consRoot.id, published: true },
    select: {
      slug: true,
      nameRu: true,
      _count: { select: { products: true, children: true } },
    },
    orderBy: { nameRu: "asc" },
  });
  console.log("LAB KIDS", labKids.length, labKids.slice(0, 20));
  console.log("CONS KIDS", consKids);
  console.log(
    "DONE added=",
    added,
    "moved=",
    moved,
    "imaged=",
    imaged,
    "skipped=",
    skipped,
    "products=",
    await prisma.product.count()
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
