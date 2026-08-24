/**
 * Import ~40-50% curated subset from medtech public API snapshot.
 * Rewrites brand to REAGENT. Uses remote product images (Cloudinary).
 * Not a 1:1 clone — subset + REAGENT identity.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const prisma = new PrismaClient();

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\|(\s*\|)+/g, "|")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSpecs(html = "") {
  const specs = [];
  const rowRe = /<tr[^>]*>\s*<t[dh][^>]*>(.*?)<\/t[dh]>\s*<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
  let m;
  while ((m = rowRe.exec(html))) {
    const label = stripHtml(m[1]).replace(/\|/g, "").trim();
    const value = stripHtml(m[2]).replace(/\|/g, "").trim();
    if (!label || !value || /параметр/i.test(label)) continue;
    if (label.length > 80 || value.length > 200) continue;
    specs.push({ labelRu: label, labelEn: label, valueRu: value, valueEn: value });
  }
  return specs.slice(0, 12);
}

function extractBrand(html = "", name = "") {
  const m = html.match(/<td[^>]*>\s*Бренд\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/is);
  if (m) {
    const b = stripHtml(m[1]).replace(/\|/g, "").trim();
    if (b) return b;
  }
  // fallback from known tokens in name
  for (const brand of [
    "B. Braun",
    "B Braun",
    "Mindray",
    "Samsung",
    "GE",
    "Edan",
    "Sony",
    "Zoncare",
    "Fujifilm",
    "Hamilton",
    "Roche",
    "Karl Storz",
  ]) {
    if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return "REAGENT Partner";
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function main() {
  const categories = JSON.parse(
    fs.readFileSync(path.join(root, "medtech-categories.json"), "utf8")
  );
  const products = JSON.parse(
    fs.readFileSync(path.join(root, "medtech-products.json"), "utf8")
  );
  const featured = JSON.parse(
    fs.readFileSync(path.join(root, "medtech-featured.json"), "utf8")
  );

  // categories that actually have products
  const catIdsWithProducts = new Set(products.map((p) => p.category_id));
  const cats = categories
    .filter((c) => catIdsWithProducts.has(c.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // ~50% products: prefer ones with images, spread categories
  const withImg = products.filter((p) => p.main_image);
  const targetCount = Math.max(12, Math.ceil(products.length * 0.5));
  const selected = [];
  const byCat = new Map();
  for (const p of withImg) {
    const list = byCat.get(p.category_id) || [];
    list.push(p);
    byCat.set(p.category_id, list);
  }
  // round-robin pick
  let guard = 0;
  while (selected.length < targetCount && guard < 500) {
    guard++;
    let added = false;
    for (const [, list] of byCat) {
      if (selected.length >= targetCount) break;
      const next = list.shift();
      if (next) {
        selected.push(next);
        added = true;
      }
    }
    if (!added) break;
  }

  const featuredIds = new Set(
    (Array.isArray(featured) ? featured : []).map((f) => f.product_id || f.id || f.slug)
  );
  // mark featured by slug match from featured payload
  const featuredSlugs = new Set();
  for (const f of Array.isArray(featured) ? featured : []) {
    if (f.slug) featuredSlugs.add(f.slug);
    if (f.product?.slug) featuredSlugs.add(f.product.slug);
  }

  await prisma.inquiry.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.article.deleteMany();

  // manufacturers from products
  const brandNames = new Map();
  for (const p of selected) {
    const b = extractBrand(p.description || "", p.name || "");
    brandNames.set(b, (brandNames.get(b) || 0) + 1);
  }

  const manufacturerMap = {};
  for (const [name] of brandNames) {
    const slug = slugify(name) || "partner";
    const m = await prisma.manufacturer.create({
      data: {
        slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
        name,
        descriptionRu: `Партнёрские поставки · ${name}`,
        descriptionEn: `Partner supply · ${name}`,
        published: true,
      },
    });
    manufacturerMap[name] = m.id;
  }

  const categoryMap = {};
  let sort = 0;
  for (const c of cats) {
    const created = await prisma.category.create({
      data: {
        slug: c.slug,
        nameRu: c.name,
        nameEn: c.name_en || c.name,
        descriptionRu: c.description || null,
        descriptionEn: c.description_en || c.description || null,
        image: c.image || null,
        sortOrder: sort++,
        published: true,
      },
    });
    categoryMap[c.id] = created.id;
  }

  // map REAGENT category slugs for leftover product cats
  for (const p of selected) {
    if (!categoryMap[p.category_id]) {
      const src = categories.find((c) => c.id === p.category_id);
      if (src) {
        const created = await prisma.category.create({
          data: {
            slug: src.slug,
            nameRu: src.name,
            nameEn: src.name_en || src.name,
            descriptionRu: src.description || null,
            descriptionEn: src.description_en || null,
            image: src.image || null,
            sortOrder: sort++,
            published: true,
          },
        });
        categoryMap[src.id] = created.id;
      }
    }
  }

  let n = 0;
  for (const p of selected) {
    const brand = extractBrand(p.description || "", p.name || "");
    const manufacturerId = manufacturerMap[brand];
    const categoryId = categoryMap[p.category_id];
    if (!categoryId) continue;

    const descText = stripHtml(p.description || "");
    const shortRu = descText.split("\n").find((l) => l.trim().length > 20)?.slice(0, 160) || null;
    const specs = parseSpecs(p.description || "");
    const isFeatured =
      featuredSlugs.has(p.slug) || n < 8;

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
          descText ||
          "Позиция каталога РЕАГЕНТ. Подробности и цена — по запросу.",
        descriptionEn:
          stripHtml(p.description_en || "") ||
          "REAGENT catalog item. Details and price on request.",
        applicationsRu: null,
        applicationsEn: null,
        featured: isFeatured,
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
        specifications:
          specs.length > 0
            ? {
                create: specs.map((s, i) => ({ ...s, sortOrder: i })),
              }
            : undefined,
      },
    });
    n++;
  }

  await prisma.article.createMany({
    data: [
      {
        slug: "how-to-request-quote",
        titleRu: "Как запросить цену",
        titleEn: "How to request a quote",
        excerptRu: "B2B-запрос без публичных цен.",
        excerptEn: "B2B quote without public prices.",
        bodyRu:
          "Выберите товар → «Запросить цену» → укажите контакты. Отдел продаж РЕАГЕНТ подготовит предложение.",
        bodyEn:
          "Select a product → Request a Quote → leave contacts. REAGENT sales will prepare an offer.",
      },
      {
        slug: "about-catalog",
        titleRu: "О каталоге РЕАГЕНТ",
        titleEn: "About REAGENT catalog",
        excerptRu: "Оборудование, реагенты, расходники.",
        excerptEn: "Equipment, reagents, consumables.",
        bodyRu:
          "Каталог ориентирован на клиники и лаборатории: УЗИ, хирургия, реанимация, лаборатория и смежные направления.",
        bodyEn:
          "Catalog for clinics and labs: ultrasound, surgery, ICU, laboratory and related domains.",
      },
    ],
  });

  console.log(
    `✓ Imported ${n} products (~50% of ${products.length}), ${Object.keys(categoryMap).length} categories, ${Object.keys(manufacturerMap).length} brands`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
