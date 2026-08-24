/**
 * REAGENT catalog builder
 * - Medtech: equipment + consumables (no drugs)
 * - Vector-Best: full scraped reagent/equipment kits (main supplier)
 * - Extra hospital/lab equipment
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Prefer DIRECT_URL (session pooler) for long seed — more reliable than transaction pgbouncer
const rawSeedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawSeedUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL required");
}
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

/** Drop sslmode from URL — Pool uses ssl.rejectUnauthorized:false for Supabase */
function pgUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url;
  }
}

const pool = new pg.Pool({
  connectionString: pgUrl(rawSeedUrl),
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 30_000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function waitForDb(retries = process.env.VERCEL ? 8 : 5) {
  let lastErr;
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✓ DB connected");
      return;
    } catch (e) {
      lastErr = e;
      console.warn(
        `DB connect attempt ${i}/${retries} failed:`,
        e.message?.slice?.(0, 160) || e
      );
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\|(\s*\|)+/g, "|")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSpecs(html = "") {
  const specs = [];
  const rowRe =
    /<tr[^>]*>\s*<t[dh][^>]*>(.*?)<\/t[dh]>\s*<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
  let m;
  while ((m = rowRe.exec(html))) {
    const label = stripHtml(m[1]).replace(/\|/g, "").trim();
    const value = stripHtml(m[2]).replace(/\|/g, "").trim();
    if (!label || !value || /параметр/i.test(label)) continue;
    if (label.length > 80 || value.length > 200) continue;
    specs.push({
      labelRu: label,
      labelEn: label,
      valueRu: value,
      valueEn: value,
    });
  }
  return specs.slice(0, 12);
}

function extractBrand(html = "", name = "") {
  const m = html.match(
    /<td[^>]*>\s*Бренд\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/is
  );
  if (m) {
    const b = stripHtml(m[1]).replace(/\|/g, "").trim();
    if (b) return b;
  }
  for (const brand of [
    "B. Braun",
    "Mindray",
    "Samsung",
    "GE",
    "Edan",
    "Sony",
    "Zoncare",
    "CA-MI",
    "Surgicon",
  ]) {
    if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return "REAGENT Partner";
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const PILLAR_MAP = {
  ultrasound: "equipment",
  "flexible-endoscopy": "equipment",
  "rigid-endoscopy": "equipment",
  radiology: "equipment",
  anesthesiology: "equipment",
  surgery: "equipment",
  ent: "equipment",
  mri: "equipment",
  gynecology: "equipment",
  rehabilitation: "equipment",
  physiotherapy: "equipment",
  "functional-diagnostics": "equipment",
  laboratory: "equipment",
  dentistry: "equipment",
  ophthalmology: "equipment",
  "meditsinskie-izdeliya": "consumables",
  prochee: "consumables",
};

const DRUG_SLUGS = new Set(["propofol-lipuro-1-50-ml-b-braun"]);

const VB_ROOT = {
  immunochemistry: {
    nameRu: "Иммунохимия",
    nameEn: "Immunochemistry",
    pillar: "reagents",
  },
  ptsr: {
    nameRu: "ПЦР",
    nameEn: "PCR",
    pillar: "reagents",
  },
  biokhimiya: {
    nameRu: "Биохимия",
    nameEn: "Clinical Chemistry",
    pillar: "reagents",
  },
  gemostaz: {
    nameRu: "Гемостаз",
    nameEn: "Hemostasis",
    pillar: "reagents",
  },
  veterinariya: {
    nameRu: "Ветеринария",
    nameEn: "Veterinary",
    pillar: "reagents",
  },
  oborudovanie: {
    nameRu: "Лабораторное оборудование",
    nameEn: "Lab Equipment",
    pillar: "equipment",
  },
};

/** Human labels for catalog path segments */
const VB_SEG_RU = {
  immunochemistry: "Иммунохимия",
  ptsr: "ПЦР",
  biokhimiya: "Биохимия",
  gemostaz: "Гемостаз",
  veterinariya: "Ветеринария",
  oborudovanie: "Оборудование",
  nabory: "Наборы",
  "immunokhemilyuminestsentnyy-analiz": "Иммунохемилюминесцентный анализ",
  "nabory-dlya-analizatorov-serii-ultima": "Наборы Ultima",
  "gemotransmissivnye-infektsii": "Гемотрансмиссивные инфекции",
  "vich-infektsiya": "ВИЧ-инфекция",
  "virusnye-gepatity-a-b-c-d-g": "Вирусные гепатиты",
  "zabolevaniya-urogenitalnogo-trakta": "Урогенитальный тракт",
  "torch-i-gerpesvirusnye-infektsii": "TORCH и герпесвирусы",
  "prirodno-ochagovye-infektsii": "Природно-очаговые инфекции",
  mikozy: "Микозы",
  "nozokomialnye-infektsii": "Нозокомиальные инфекции",
  "respiratornye-infektsii": "Респираторные инфекции",
  neyroinfektsii: "Нейроинфекции",
  "zheludochno-kishechnye-infektsii": "Желудочно-кишечные инфекции",
  tuberkulez: "Туберкулёз",
  onkologiya: "Онкология",
  "odnonukleotidnye-polimorfizmy-i-mutatsii-v-genakh-cheloveka":
    "Генетика и полиморфизмы",
  "infektsii-dykhatelnykh-putey": "Инфекции дыхательных путей",
  "infektsii-zhkt": "Инфекции ЖКТ",
  "infektsii-mochepolovoy-sistemy": "Инфекции МПС",
  "markery-gepatitov": "Маркеры гепатитов",
  "markery-vich": "Маркеры ВИЧ",
  gormony: "Гормоны",
  "onkomarkery": "Онкомаркеры",
  "autoimmunnye-zabolevaniya": "Аутоиммунные заболевания",
  "reproduktive": "Репродукция",
  "kontrolnye-materialy": "Контрольные материалы",
  rastvory: "Растворы",
  kalibratory: "Калибраторы",
};

function vbSegName(seg) {
  if (VB_SEG_RU[seg]) return VB_SEG_RU[seg];
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const u = (id) =>
  `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

const EXTRA_EQUIPMENT = [
  {
    slug: "rg-lab-centrifuge",
    sku: "RG-LAB-CEN-01",
    nameRu: "Центрифуга лабораторная настольная",
    nameEn: "Benchtop laboratory centrifuge",
    shortRu: "Настольная центрифуга для клинических лабораторий.",
    shortEn: "Benchtop centrifuge for clinical labs.",
    descRu: "Оборудование. Параметры — по запросу.",
    descEn: "Equipment. Specs on request.",
    image: u("photo-1576086213369-97a306d36557"),
    brand: "REAGENT Lab Line",
    featured: true,
    cat: "laboratory-equipment",
  },
  {
    slug: "rg-patient-monitor",
    sku: "RG-EQ-MON-01",
    nameRu: "Монитор пациента мультипараметрический",
    nameEn: "Multiparameter patient monitor",
    shortRu: "Мониторинг витальных функций.",
    shortEn: "Vital signs monitoring.",
    descRu: "Оборудование ОРИТ/отделения. Конфигурация — по запросу.",
    descEn: "Ward/ICU equipment. Configuration on request.",
    image: u("photo-1519494026892-80bbd2d6fd0d"),
    brand: "REAGENT Hospital Systems",
    featured: true,
    cat: "icu-equipment",
  },
  {
    slug: "rg-ventilator-icu",
    sku: "RG-EQ-VENT-01",
    nameRu: "Аппарат ИВЛ (ОРИТ)",
    nameEn: "ICU ventilator",
    shortRu: "Аппарат искусственной вентиляции лёгких.",
    shortEn: "Mechanical ventilator for intensive care.",
    descRu: "Конфигурация — по запросу.",
    descEn: "Configuration on request.",
    image: u("photo-1666214280557-f1b5022eb634"),
    brand: "REAGENT Hospital Systems",
    featured: true,
    cat: "icu-equipment",
  },
  {
    slug: "rg-autoclave",
    sku: "RG-EQ-AC-01",
    nameRu: "Автоклав паровой (стерилизатор)",
    nameEn: "Steam autoclave sterilizer",
    shortRu: "Стерилизация инструментов и материалов.",
    shortEn: "Sterilization of instruments and materials.",
    descRu: "Объём камеры — по запросу.",
    descEn: "Chamber volume on request.",
    image: u("photo-1581595220892-b0739db3b8c5"),
    brand: "REAGENT Hospital Systems",
    featured: true,
    cat: "sterilization",
  },
];

async function upsertManufacturer(map, name) {
  if (map[name]) return map[name];
  const base = slugify(name) || "partner";
  const m = await prisma.manufacturer.create({
    data: {
      slug: `${base}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      descriptionRu: `Поставщик · ${name}`,
      descriptionEn: `Supplier · ${name}`,
      published: true,
    },
  });
  map[name] = m.id;
  return m.id;
}

async function main() {
  await waitForDb();

  const existingProducts = await prisma.product.count();
  const force = process.env.FORCE_CATALOG_SEED === "1";
  if (existingProducts > 50 && !force) {
    console.log(
      `✓ Catalog already seeded (${existingProducts} products). Skip rebuild. Set FORCE_CATALOG_SEED=1 to rebuild.`
    );
    return;
  }

  const medCats = JSON.parse(
    fs.readFileSync(path.join(root, "medtech-categories.json"), "utf8")
  );
  const medProds = JSON.parse(
    fs.readFileSync(path.join(root, "medtech-products.json"), "utf8")
  );
  const vbPath = path.join(root, "data", "vector-best-products.json");
  if (!fs.existsSync(vbPath)) {
    throw new Error(
      "Missing data/vector-best-products.json — run: node scripts/vb-scrape.mjs"
    );
  }
  const vbProds = JSON.parse(fs.readFileSync(vbPath, "utf8"));
  const deznetPath = path.join(root, "data", "deznet-categories.json");
  if (!fs.existsSync(deznetPath)) {
    throw new Error(
      "Missing data/deznet-categories.json — run: node scripts/deznet-scrape-cats.mjs"
    );
  }
  const deznetCats = JSON.parse(fs.readFileSync(deznetPath, "utf8"));

  // —— Snapshot admin products (survive catalog rebuild on Supabase)
  const adminFromDb = await prisma.product.findMany({
    where: { source: "admin" },
    include: {
      category: { select: { slug: true } },
      manufacturer: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
    },
  });
  const adminSnap = adminFromDb.map((p) => ({
    slug: p.slug,
    sku: p.sku,
    model: p.model,
    nameRu: p.nameRu,
    nameEn: p.nameEn,
    shortRu: p.shortRu,
    shortEn: p.shortEn,
    descriptionRu: p.descriptionRu,
    descriptionEn: p.descriptionEn,
    applicationsRu: p.applicationsRu,
    applicationsEn: p.applicationsEn,
    published: p.published,
    featured: p.featured,
    categorySlug: p.category?.slug || null,
    manufacturerName: p.manufacturer?.name || null,
    imageUrl: p.images[0]?.url || null,
    specifications: p.specifications.map((s) => ({
      labelRu: s.labelRu,
      labelEn: s.labelEn,
      valueRu: s.valueRu,
      valueEn: s.valueEn,
    })),
  }));

  // Detach inquiries from products (keep inquiry rows + users forever)
  await prisma.inquiry.updateMany({ data: { productId: null } });

  // Wipe catalog only — NEVER delete Inquiry / User / AdminUser
  await prisma.productSpecification.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.article.deleteMany();

  const slugToId = {};
  const pathToId = {};
  let sort = 1;
  const mfr = {};

  // —— Full Deznet category tree (structure clone)
  const level1 = deznetCats.filter((c) => c.level === 1);
  const level2 = deznetCats.filter((c) => c.level >= 2);
  for (const c of level1) {
    const created = await prisma.category.create({
      data: {
        slug: c.slug,
        nameRu: c.nameRu,
        nameEn: c.nameEn || c.nameRu,
        descriptionRu: `Раздел каталога: ${c.nameRu}`,
        descriptionEn: c.nameEn || c.nameRu,
        parentId: null,
        sortOrder: sort++,
        published: true,
      },
    });
    slugToId[c.slug] = created.id;
    pathToId[c.path] = created.id;
  }
  for (const c of level2) {
    const parentId = c.parentPath ? pathToId[c.parentPath] : null;
    let slug = c.slug;
    // avoid collisions across different parents
    if (slugToId[slug]) {
      slug = `${c.slug}-${slugify(c.parentPath || "x").slice(0, 20)}`;
    }
    try {
      const created = await prisma.category.create({
        data: {
          slug,
          nameRu: c.nameRu,
          nameEn: c.nameEn || c.nameRu,
          parentId,
          sortOrder: sort++,
          published: true,
        },
      });
      slugToId[c.slug] = created.id;
      slugToId[slug] = created.id;
      pathToId[c.path] = created.id;
    } catch {
      const created = await prisma.category.create({
        data: {
          slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
          nameRu: c.nameRu,
          nameEn: c.nameEn || c.nameRu,
          parentId,
          sortOrder: sort++,
          published: true,
        },
      });
      pathToId[c.path] = created.id;
      slugToId[created.slug] = created.id;
    }
  }

  // Aliases for existing product mapping (medtech / extras / reagents)
  const pick = (...slugs) => {
    for (const s of slugs) if (slugToId[s]) return slugToId[s];
    return null;
  };
  const pillars = {
    equipment:
      pick(
        "oborudovanie_diagnosticheskoe",
        "hirurgicheskoe_oborudovanie_i_instrumenty",
        "reanimatsionnoe_oborudovanie"
      ) || Object.values(pathToId)[0],
    consumables:
      pick("raskhodniki_meditsinskie", "perevyazka", "meditsinskaya_odezhda") ||
      Object.values(pathToId)[0],
    reagents:
      pick("reagenty_dlya_laboratornykh_issledovaniy", "laboratoriya") ||
      Object.values(pathToId)[0],
  };
  // ensure named aliases for product seed code
  slugToId.equipment = pillars.equipment;
  slugToId.consumables = pillars.consumables;
  slugToId.reagents = pillars.reagents;
  slugToId["laboratory-equipment"] =
    pick("laboratoriya") || pillars.equipment;
  slugToId["icu-equipment"] =
    pick("reanimatsionnoe_oborudovanie") || pillars.equipment;
  slugToId.sterilization =
    pick("oborudovanie_dlya_dezinfektsii_i_sterilizatsii") || pillars.equipment;
  slugToId.ultrasound = pick("oborudovanie_diagnosticheskoe") || pillars.equipment;
  slugToId.surgery =
    pick("hirurgicheskoe_oborudovanie_i_instrumenty") || pillars.equipment;
  slugToId["rigid-endoscopy"] =
    pick("oborudovanie_endoskopicheskoe") || pillars.equipment;
  slugToId.radiology =
    pick("oborudovanie_diagnosticheskoe") || pillars.equipment;
  slugToId.anesthesiology =
    pick("reanimatsionnoe_oborudovanie") || pillars.equipment;
  slugToId["functional-diagnostics"] =
    pick("pribory_izmeritelnye", "oborudovanie_diagnosticheskoe") ||
    pillars.equipment;
  slugToId["meditsinskie-izdeliya"] =
    pick("raskhodniki_meditsinskie") || pillars.consumables;
  slugToId.prochee = pick("raskhodniki_meditsinskie") || pillars.consumables;

  // Medtech categories → map into deznet tree (or create under best pillar)
  const medCatMap = {};
  const usedMedCatIds = new Set(
    medProds.filter((p) => !DRUG_SLUGS.has(p.slug)).map((p) => p.category_id)
  );
  for (const c of medCats.filter((c) => usedMedCatIds.has(c.id))) {
    // prefer existing deznet slug match
    if (slugToId[c.slug]) {
      medCatMap[c.id] = slugToId[c.slug];
      continue;
    }
    const pillar = PILLAR_MAP[c.slug] || "equipment";
    const parentId = pillars[pillar] || pillars.equipment;
    try {
      const created = await prisma.category.create({
        data: {
          slug: c.slug,
          nameRu: c.name,
          nameEn: c.name_en || c.name,
          descriptionRu: c.description || null,
          descriptionEn: c.description_en || null,
          image: c.image || null,
          parentId,
          sortOrder: sort++,
          published: true,
        },
      });
      medCatMap[c.id] = created.id;
      slugToId[c.slug] = created.id;
    } catch {
      medCatMap[c.id] = parentId;
    }
  }

  // Vector-Best sub-structure under «Реагенты для лабораторных исследований»
  const reagentsRootId = pillars.reagents;
  const vbRootIds = {};
  for (const [key, meta] of Object.entries(VB_ROOT)) {
    if (meta.pillar === "equipment") {
      // attach under lab equipment root
      const parentId = slugToId.laboratoriya || pillars.equipment;
      const created = await prisma.category.create({
        data: {
          slug: `vb-${key}`,
          nameRu: meta.nameRu,
          nameEn: meta.nameEn,
          parentId,
          sortOrder: sort++,
          published: true,
        },
      });
      vbRootIds[key] = created.id;
      slugToId[`vb-${key}`] = created.id;
      continue;
    }
    const created = await prisma.category.create({
      data: {
        slug: `vb-${key}`,
        nameRu: meta.nameRu,
        nameEn: meta.nameEn,
        parentId: reagentsRootId,
        sortOrder: sort++,
        published: true,
      },
    });
    vbRootIds[key] = created.id;
    slugToId[`vb-${key}`] = created.id;
  }

  // Vector-Best leaf categories
  const vbLeafIds = {};
  const leaves = [
    ...new Set(
      vbProds.map((p) => `${p.rootSlug}||${p.leafSlug}||${p.categoryPath}`)
    ),
  ];
  for (const key of leaves) {
    const [rootSlug, leafSlug, categoryPath] = key.split("||");
    const rootId = vbRootIds[rootSlug] || reagentsRootId;
    if (vbLeafIds[categoryPath]) continue;
    const pathParts = String(categoryPath)
      .split("/")
      .filter((s) => s && s !== "catalog");
    const slug = `vb-${slugify(pathParts.join("-"))}`.slice(0, 80);
    const nameRu = vbSegName(
      leafSlug || pathParts[pathParts.length - 1] || rootSlug
    );
    const nameEn = nameRu;
    try {
      const created = await prisma.category.create({
        data: {
          slug,
          nameRu,
          nameEn,
          parentId: rootId,
          sortOrder: sort++,
          published: true,
        },
      });
      vbLeafIds[categoryPath] = created.id;
    } catch {
      const created = await prisma.category.create({
        data: {
          slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
          nameRu,
          nameEn,
          parentId: rootId,
          sortOrder: sort++,
          published: true,
        },
      });
      vbLeafIds[categoryPath] = created.id;
    }
  }

  // —— Medtech products
  let medCount = 0;
  for (const p of medProds) {
    if (DRUG_SLUGS.has(p.slug)) continue;
    const categoryId = medCatMap[p.category_id];
    if (!categoryId) continue;
    const brand = extractBrand(p.description || "", p.name || "");
    const manufacturerId = await upsertManufacturer(mfr, brand);
    const descText = stripHtml(p.description || "");
    const shortRu =
      descText.split("\n").find((l) => l.trim().length > 20)?.slice(0, 160) ||
      null;
    const specs = parseSpecs(p.description || "");
    const images = [];
    if (p.main_image) images.push(p.main_image);
    for (const img of p.images || []) {
      if (img && !images.includes(img)) images.push(img);
    }

    await prisma.product.create({
      data: {
        slug: p.slug,
        sku: p.sku || null,
        model: p.sku || null,
        nameRu: p.name,
        nameEn: p.name_en || p.name,
        shortRu,
        shortEn: shortRu,
        descriptionRu:
          descText || "Позиция каталога РЕАГЕНТ. Цена — по запросу.",
        descriptionEn:
          stripHtml(p.description_en || "") ||
          "REAGENT catalog item. Price on request.",
        featured: medCount < 4,
        published: true,
        categoryId,
        manufacturerId,
        images: {
          create: images.slice(0, 4).map((url, i) => ({
            url,
            altRu: p.name,
            altEn: p.name_en || p.name,
            sortOrder: i,
          })),
        },
        specifications: specs.length
          ? { create: specs.map((s, i) => ({ ...s, sortOrder: i })) }
          : undefined,
      },
    });
    medCount++;
  }

  // —— Reagent products from supplier catalog (no supplier brand on site)
  let vbCount = 0;
  let featuredVb = 0;
  for (const p of vbProds) {
    const categoryId =
      vbLeafIds[p.categoryPath] ||
      vbRootIds[p.rootSlug] ||
      pillars.reagents;
    const specs = [];
    if (p.qty) {
      specs.push({
        labelRu: "Количество определений",
        labelEn: "Number of tests",
        valueRu: String(p.qty),
        valueEn: String(p.qty),
        sortOrder: 0,
      });
    }
    if (p.registration) {
      specs.push({
        labelRu: "Регистрация",
        labelEn: "Registration",
        valueRu: p.registration,
        valueEn: p.registration,
        sortOrder: 1,
      });
    }

    // ASCII-only slug (Cyrillic breaks product URLs on Vercel/Next)
    let slug = `rg-${String(p.sku || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    if (!slug || slug === "rg-") slug = `rg-item-${vbCount}`;
    if (slug.length > 80) slug = slug.slice(0, 80);

    const nameRu = String(p.nameRu || p.sku || "Реагент").trim();
    const nameEn = String(p.nameEn || p.nameRu || p.sku || "Reagent").trim();
    const shortRu =
      p.descriptionRu?.slice(0, 180) ||
      (p.qty ? `Определений: ${p.qty}` : null);
    const shortEn =
      p.descriptionEn?.slice(0, 180) ||
      (p.qty ? `Tests: ${p.qty}` : null);
    const descriptionRu =
      p.descriptionRu ||
      `${nameRu}. Каталожный № ${p.sku || "—"}. Цена по запросу.`;
    const descriptionEn =
      p.descriptionEn ||
      `${nameEn}. Cat. No. ${p.sku || "—"}. Price on request.`;

    try {
      await prisma.product.create({
        data: {
          slug,
          sku: p.sku,
          model: p.sku,
          nameRu,
          nameEn,
          shortRu,
          shortEn,
          descriptionRu,
          descriptionEn,
          featured: featuredVb < 8 && p.pillar === "reagents",
          published: true,
          categoryId,
          // no manufacturer label — show only real product name
          manufacturerId: null,
          images: {
            create: [
              {
                url: p.image,
                altRu: nameRu,
                altEn: nameEn,
                sortOrder: 0,
              },
            ],
          },
          specifications: specs.length
            ? { create: specs }
            : undefined,
        },
      });
      if (featuredVb < 8 && p.pillar === "reagents") featuredVb++;
      vbCount++;
    } catch (e) {
      // slug collision
      try {
        await prisma.product.create({
          data: {
            slug: `${slug}-${vbCount}`,
            sku: p.sku,
            nameRu,
            nameEn,
            shortRu,
            shortEn,
            descriptionRu,
            descriptionEn,
            published: true,
            categoryId,
            manufacturerId: null,
            images: {
              create: [
                {
                  url: p.image,
                  altRu: nameRu,
                  altEn: nameEn,
                  sortOrder: 0,
                },
              ],
            },
          },
        });
        vbCount++;
      } catch (e2) {
        console.warn("skip", p.sku, e2.message);
      }
    }
  }

  // Extra equipment
  for (const e of EXTRA_EQUIPMENT) {
    const manufacturerId = await upsertManufacturer(mfr, e.brand);
    await prisma.product.create({
      data: {
        slug: e.slug,
        sku: e.sku,
        model: e.sku,
        nameRu: e.nameRu,
        nameEn: e.nameEn,
        shortRu: e.shortRu,
        shortEn: e.shortEn,
        descriptionRu: e.descRu,
        descriptionEn: e.descEn,
        featured: !!e.featured,
        published: true,
        categoryId: slugToId[e.cat] || pillars.equipment,
        manufacturerId,
        images: {
          create: [
            {
              url: e.image,
              altRu: e.nameRu,
              altEn: e.nameEn,
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  // —— Full Deznet catalog products (all categories)
  let dezCount = 0;
  const dezFile = path.join(root, "data", "deznet-all-products.json");
  const dezFileAlt = path.join(root, "data", "deznet-equipment-products.json");
  const dezProds = fs.existsSync(dezFile)
    ? JSON.parse(fs.readFileSync(dezFile, "utf8"))
    : fs.existsSync(dezFileAlt)
      ? JSON.parse(fs.readFileSync(dezFileAlt, "utf8"))
      : [];
  const partnerId = await upsertManufacturer(mfr, "REAGENT Partner");
  for (const p of dezProds) {
    const categoryId =
      slugToId[p.categorySlug] ||
      pathToId[p.categoryPath] ||
      pillars.consumables ||
      pillars.equipment;
    if (!categoryId || !p.nameRu) continue;
    let slug = p.slug || `dz-${p.bitrixId || dezCount}`;
    if (slug.length > 80) slug = slug.slice(0, 80);
    try {
      await prisma.product.create({
        data: {
          slug,
          sku: p.sku || `DZ-${p.bitrixId}`,
          model: p.sku || null,
          nameRu: p.nameRu,
          nameEn: p.nameEn || p.nameRu,
          shortRu: p.shortRu || p.nameRu.slice(0, 160),
          shortEn: p.shortEn || (p.nameEn || p.nameRu).slice(0, 160),
          descriptionRu:
            p.descriptionRu ||
            `${p.nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
          descriptionEn:
            p.descriptionEn ||
            `${p.nameEn || p.nameRu}. Supplied via REAGENT. Price on request.`,
          featured: dezCount < 6,
          published: true,
          categoryId,
          manufacturerId: partnerId,
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
      dezCount++;
    } catch {
      try {
        await prisma.product.create({
          data: {
            slug: `${slug}-${dezCount}`,
            sku: p.sku || `DZ-${p.bitrixId}-${dezCount}`,
            nameRu: p.nameRu,
            nameEn: p.nameEn || p.nameRu,
            shortRu: p.shortRu || null,
            shortEn: p.shortEn || null,
            descriptionRu: p.descriptionRu || p.nameRu,
            descriptionEn: p.descriptionEn || p.nameEn || p.nameRu,
            published: true,
            categoryId,
            manufacturerId: partnerId,
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
        dezCount++;
      } catch (e2) {
        // skip
      }
    }
  }
  console.log("deznet products imported:", dezCount);

  // —— Admin-created products (DB snapshot + data/admin-products.json)
  let adminCount = 0;
  const adminBySlug = new Map();
  for (const p of adminSnap) {
    if (p?.slug) adminBySlug.set(p.slug, p);
  }
  const adminFiles = [
    path.join(root, "data", "admin-products.json"),
    "/tmp/admin-products.json",
  ];
  for (const f of adminFiles) {
    try {
      if (fs.existsSync(f)) {
        const raw = JSON.parse(fs.readFileSync(f, "utf8"));
        if (Array.isArray(raw)) {
          for (const p of raw) {
            if (p?.slug && !adminBySlug.has(p.slug)) adminBySlug.set(p.slug, p);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  const adminProds = [...adminBySlug.values()];
  for (const p of adminProds) {
    if (!p?.nameRu || !p?.slug) continue;
    const categoryId =
      slugToId[p.categorySlug] ||
      pillars.consumables ||
      pillars.equipment ||
      pillars.reagents;
    if (!categoryId) continue;
    const manufacturerId = p.manufacturerName
      ? await upsertManufacturer(mfr, p.manufacturerName)
      : partnerId;
    let slug = String(p.slug).slice(0, 80);
    try {
      await prisma.product.create({
        data: {
          slug,
          sku: p.sku || null,
          model: p.model || p.sku || null,
          nameRu: p.nameRu,
          nameEn: p.nameEn || p.nameRu,
          shortRu: p.shortRu || null,
          shortEn: p.shortEn || null,
          descriptionRu: p.descriptionRu || p.nameRu,
          descriptionEn: p.descriptionEn || p.nameEn || p.nameRu,
          featured: !!p.featured,
          published: p.published !== false,
          source: "admin",
          categoryId,
          manufacturerId,
          images: p.imageUrl
            ? {
                create: [
                  {
                    url: p.imageUrl,
                    altRu: p.nameRu,
                    altEn: p.nameEn || p.nameRu,
                    sortOrder: 0,
                  },
                ],
              }
            : undefined,
          specifications: Array.isArray(p.specifications) && p.specifications.length
            ? {
                create: p.specifications.map((s, i) => ({
                  labelRu: s.labelRu,
                  labelEn: s.labelEn || s.labelRu,
                  valueRu: s.valueRu,
                  valueEn: s.valueEn || s.valueRu,
                  sortOrder: i,
                })),
              }
            : undefined,
        },
      });
      adminCount++;
    } catch {
      try {
        slug = `${slug}-adm${adminCount}`;
        await prisma.product.create({
          data: {
            slug,
            sku: p.sku || null,
            nameRu: p.nameRu,
            nameEn: p.nameEn || p.nameRu,
            shortRu: p.shortRu || null,
            shortEn: p.shortEn || null,
            descriptionRu: p.descriptionRu || p.nameRu,
            descriptionEn: p.descriptionEn || p.nameEn || p.nameRu,
            featured: !!p.featured,
            published: p.published !== false,
            source: "admin",
            categoryId,
            manufacturerId,
            images: p.imageUrl
              ? {
                  create: [
                    {
                      url: p.imageUrl,
                      altRu: p.nameRu,
                      altEn: p.nameEn || p.nameRu,
                      sortOrder: 0,
                    },
                  ],
                }
              : undefined,
          },
        });
        adminCount++;
      } catch {
        /* skip duplicate/invalid */
      }
    }
  }
  console.log("admin products imported:", adminCount);

  await prisma.article.createMany({
    data: [
      {
        slug: "reagent-catalog-overview",
        titleRu: "Каталог реагентов и лабораторных наборов",
        titleEn: "Reagents and lab kits catalog",
        excerptRu:
          "ПЦР, иммунохимия, ИФА, биохимия, гемостаз — позиции с ценой по запросу.",
        excerptEn:
          "PCR, immunochemistry, ELISA, chemistry, hemostasis — price on request.",
        bodyRu:
          "В каталоге РЕАГЕНТ (reagent.tj) — наборы для ПЦР-диагностики, иммунохимии, клинической биохимии и гемостаза для лабораторий Таджикистана. Укажите артикул и запросите коммерческое предложение.",
        bodyEn:
          "The REAGENT (reagent.tj) catalog includes PCR, immunochemistry, clinical chemistry and hemostasis kits for labs in Tajikistan. Quote by SKU or product name.",
      },
      {
        slug: "how-to-request-quote",
        titleRu: "Как запросить цену",
        titleEn: "How to request a quote",
        excerptRu: "B2B без публичных цен в Таджикистане.",
        excerptEn: "B2B without public prices in Tajikistan.",
        bodyRu:
          "Выберите товар на reagent.tj → «Запросить цену» → укажите контакты и количество. Поставка: Душанбе и регионы Таджикистана.",
        bodyEn:
          "Select a product on reagent.tj → Request a Quote → leave contacts and quantity. Delivery: Dushanbe and regions of Tajikistan.",
      },
      {
        slug: "medical-supply-tajikistan",
        titleRu: "Поставка медтехники и реагентов в Таджикистан",
        titleEn: "Medical equipment and reagents supply in Tajikistan",
        excerptRu:
          "РЕАГЕНТ — B2B для клиник и лабораторий: Душанбе, Худжанд, регионы.",
        excerptEn:
          "REAGENT B2B for clinics and labs: Dushanbe, Khujand, regions.",
        bodyRu:
          "Компания РЕАГЕНТ (reagent.tj) поставляет медицинское оборудование, лабораторные реагенты и расходные материалы в Таджикистан. Работаем с государственными и частными клиниками, диагностическими лабораториями и дистрибьюторами. Основные направления: УЗИ и стационарное оборудование, расходники, реагенты для ПЦР, ИФА и биохимии. Цены — по запросу, с учётом объёма и логистики по Душанбе и регионам.",
        bodyEn:
          "REAGENT (reagent.tj) supplies medical equipment, lab reagents and consumables in Tajikistan. We work with public and private clinics, diagnostic labs and distributors. Focus: ultrasound and hospital equipment, consumables, PCR/ELISA/chemistry reagents. Prices on request based on volume and logistics across Dushanbe and regions.",
      },
      {
        slug: "lab-reagents-dushanbe",
        titleRu: "Лабораторные реагенты в Душанбе",
        titleEn: "Laboratory reagents in Dushanbe",
        excerptRu: "ПЦР, ИФА, биохимия — запрос цены на reagent.tj",
        excerptEn: "PCR, ELISA, chemistry — quote on reagent.tj",
        bodyRu:
          "Для клинических лабораторий в Душанбе и по Таджикистану РЕАГЕНТ предлагает наборы для молекулярной диагностики (ПЦР), иммунохимии и клинической химии. Оформите заявку на сайте reagent.tj — менеджер подготовит коммерческое предложение под ваш перечень тестов и объём.",
        bodyEn:
          "For clinical labs in Dushanbe and across Tajikistan, REAGENT offers molecular diagnostics (PCR), immunochemistry and clinical chemistry kits. Submit a request on reagent.tj — sales will prepare a quote for your test menu and volume.",
      },
    ],
  });

  const counts = {
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    manufacturers: await prisma.manufacturer.count(),
    medtech: medCount,
    vectorBest: vbCount,
    admin: adminCount,
    equipment: await prisma.product.count({
      where: {
        OR: [
          { categoryId: pillars.equipment },
          { category: { parentId: pillars.equipment } },
          { category: { parent: { parentId: pillars.equipment } } },
        ],
      },
    }),
    consumables: await prisma.product.count({
      where: {
        OR: [
          { categoryId: pillars.consumables },
          { category: { parentId: pillars.consumables } },
          { category: { parent: { parentId: pillars.consumables } } },
        ],
      },
    }),
    reagents: await prisma.product.count({
      where: {
        OR: [
          { categoryId: pillars.reagents },
          { category: { parentId: pillars.reagents } },
          { category: { parent: { parentId: pillars.reagents } } },
        ],
      },
    }),
  };
  console.log("✓ REAGENT catalog built:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  });
