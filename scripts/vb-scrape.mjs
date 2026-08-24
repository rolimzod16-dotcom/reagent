/**
 * Scrape Vector-Best catalog (public HTML listing pages).
 * Output: data/vector-best-products.json
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const BASE = "https://vector-best.ru";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: 45000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(new URL(res.headers.location, url).href).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

function strip(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCategoryLinks(html) {
  const links = [...html.matchAll(/href="(\/catalog\/[a-z0-9\-\/]+\/)"/gi)].map(
    (m) => m[1]
  );
  return [...new Set(links)].filter(
    (l) =>
      l !== "/catalog/" &&
      !l.includes("dokumentatsiya") &&
      !l.includes("programmnoe-obespechenie") &&
      // reagents only — skip equipment branches under VB catalog
      !/\/oborudovanie(\/|$)/i.test(l)
  );
}

function parseListProducts(html, pageUrl) {
  const products = [];
  const items = html.split(/class="service-list__item"/i).slice(1);
  for (const raw of items) {
    const block = raw.slice(0, 4000);
    const idM = block.match(/^[^>]*id="(bx_[^"]+)"/);
    const fields = {};
    const fieldBlocks = [
      ...block.matchAll(
        /service-card__key[^>]*>([\s\S]*?)<\/div>\s*<div class="service-card__title[^"]*"[^>]*>([\s\S]*?)<\/div>(?:\s*<div class="service-card__text[^"]*"[^>]*>([\s\S]*?)<\/div>)?/gi
      ),
    ];
    for (const f of fieldBlocks) {
      const key = strip(f[1]);
      const title = strip(f[2]);
      const text = f[3] ? strip(f[3]) : "";
      if (key) fields[key] = { title, text };
    }
    const sku = (fields["Кат. №"]?.title || fields["Кат. №"]?.text || "")
      .replace(/\s+/g, "")
      .trim();
    const name = fields["Название"]?.title;
    // D-… PCR/IFA kits, B-… biochemistry, H-… hemostasis, V-… veterinary, etc.
    if (!sku || !name || !/^[A-Z]-\d+/i.test(sku)) continue;
    const qty =
      fields["Количество определений"]?.title ||
      fields["Количество определений"]?.text ||
      null;
    const extra =
      fields["Дополнительная информация"]?.title ||
      fields["Дополнительная информация"]?.text ||
      fields["Название"]?.text ||
      null;
    products.push({
      sku,
      nameRu: name,
      nameEn: name,
      descriptionRu: [extra, qty ? `Определений: ${qty}` : null]
        .filter(Boolean)
        .join(". "),
      descriptionEn: [extra, qty ? `Tests: ${qty}` : null]
        .filter(Boolean)
        .join(". "),
      qty,
      registration: (extra || "").match(/РУ[^.]{0,80}/)?.[0] || null,
      bitrixId: idM?.[1] || null,
      pageUrl,
      image: null,
    });
  }
  return products;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

// Map path segment → RU/EN names (no supplier brand in UI labels)
const ROOT_META = {
  immunochemistry: {
    nameRu: "Иммунохимия",
    nameEn: "Immunochemistry",
    pillar: "reagents",
  },
  ptsr: { nameRu: "ПЦР", nameEn: "PCR", pillar: "reagents" },
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

// Fallback images by category keyword
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80",
  "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=900&q=80",
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&q=80",
  "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=900&q=80",
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&q=80",
  "https://images.unsplash.com/photo-1615461065929-4f8ffed6ca40?w=900&q=80",
  "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80",
  "https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=900&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&q=80",
  "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900&q=80",
  "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&q=80",
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900&q=80",
  "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=900&q=80",
];

function fallbackImage(sku, index) {
  // stable pick by sku hash so same product always same fallback
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return FALLBACK_IMAGES[(h + index) % FALLBACK_IMAGES.length];
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("1) Fetch catalog root…");
  const rootPage = await fetch(BASE + "/catalog/");
  let links = parseCategoryLinks(rootPage.body);
  // reagent branches only (no equipment)
  const seeds = [
    "/catalog/immunochemistry/",
    "/catalog/ptsr/",
    "/catalog/biokhimiya/",
    "/catalog/gemostaz/",
    "/catalog/veterinariya/",
  ];
  links = links.filter(
    (l) =>
      seeds.some((s) => l.startsWith(s)) &&
      !/\/oborudovanie(\/|$)/i.test(l) &&
      !l.includes("dokumentatsiya") &&
      !l.includes("programmnoe-obespechenie")
  );
  for (const s of seeds) if (!links.includes(s)) links.push(s);

  // BFS expand category tree
  const queue = [...links];
  const seenPages = new Set();
  const categoryPaths = new Set();

  while (queue.length) {
    const pathUrl = queue.shift();
    if (seenPages.has(pathUrl)) continue;
    if (/\/oborudovanie(\/|$)/i.test(pathUrl)) continue;
    if (pathUrl.includes("dokumentatsiya")) continue;
    if (pathUrl.includes("programmnoe-obespechenie")) continue;
    seenPages.add(pathUrl);
    categoryPaths.add(pathUrl);
    if (seenPages.size > 500) break; // safety
    try {
      const { status, body } = await fetch(BASE + pathUrl);
      if (status !== 200) continue;
      for (const c of parseCategoryLinks(body)) {
        if (
          !seenPages.has(c) &&
          seeds.some((s) => c.startsWith(s)) &&
          !/\/oborudovanie(\/|$)/i.test(c) &&
          !c.includes("dokumentatsiya") &&
          c.split("/").filter(Boolean).length <= 7
        ) {
          queue.push(c);
        }
      }
      await sleep(100);
    } catch (e) {
      console.warn("cat fail", pathUrl, e.message);
    }
  }

  console.log("category pages discovered:", categoryPaths.size);

  // Scrape products from each page
  const bySku = new Map();
  let i = 0;
  for (const pathUrl of categoryPaths) {
    i++;
    try {
      const { status, body } = await fetch(BASE + pathUrl);
      if (status !== 200) continue;
      const products = parseListProducts(body, BASE + pathUrl);
      // extract section images from page (product line photos)
      const pageImgs = [
        ...body.matchAll(
          /src="(\/upload\/resize_cache\/iblock\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
        ),
      ].map((m) => BASE + m[1]);
      for (const p of products) {
        const pathParts = pathUrl.split("/").filter(Boolean);
        // path: catalog / root / ... / leaf
        const rootSlug = pathParts[1] || "catalog";
        const leafSlug = pathParts[pathParts.length - 1] || rootSlug;
        const meta = ROOT_META[rootSlug] || {
          nameRu: rootSlug,
          nameEn: rootSlug,
          pillar: "reagents",
        };
        const existing = bySku.get(p.sku);
        // assign first non-null page image cyclically if product has no image
        const pageImg =
          pageImgs.length > 0
            ? pageImgs[bySku.size % pageImgs.length]
            : null;
        if (!existing) {
          bySku.set(p.sku, {
            ...p,
            image: pageImg,
            categoryPath: pathUrl,
            rootSlug,
            leafSlug,
            pillar: meta.pillar,
            rootNameRu: meta.nameRu,
            rootNameEn: meta.nameEn,
            leafNameRu: leafSlug.replace(/-/g, " "),
          });
        } else if (!existing.image && pageImg) {
          existing.image = pageImg;
        }
      }
      if (i % 10 === 0) {
        console.log(
          `scanned ${i}/${categoryPaths.size}, products so far ${bySku.size}`
        );
      }
      await sleep(100);
    } catch (e) {
      console.warn("page fail", pathUrl, e.message);
    }
  }

  // assign fallbacks for missing images
  let idx = 0;
  for (const p of bySku.values()) {
    if (!p.image) {
      p.image = fallbackImage(p.sku, idx++);
      p.imageFallback = true;
    } else {
      p.imageFallback = false;
    }
    // ASCII-only: Cyrillic in slugs breaks product URLs
    p.slug = `vb-${String(p.sku)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    p.manufacturer = null;
  }

  const list = [...bySku.values()];
  const outPath = path.join(outDir, "vector-best-products.json");
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), "utf8");

  // category summary
  const byLeaf = {};
  for (const p of list) {
    const k = p.categoryPath;
    byLeaf[k] = (byLeaf[k] || 0) + 1;
  }
  fs.writeFileSync(
    path.join(outDir, "vector-best-categories.json"),
    JSON.stringify(byLeaf, null, 2),
    "utf8"
  );

  console.log("✓ Saved", list.length, "products →", outPath);
  console.log(
    "with source images",
    list.filter((p) => !p.imageFallback).length,
    "fallback images",
    list.filter((p) => p.imageFallback).length
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
