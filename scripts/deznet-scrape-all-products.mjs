/**
 * FULL product scrape from deznet.ru — all categories A–Z
 * Resumable. Output: data/deznet-all-products.json
 *
 * Run: node scripts/deznet-scrape-all-products.mjs
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const outPath = path.join(outDir, "deznet-all-products.json");
const progressPath = path.join(outDir, "deznet-all-progress.json");
const BASE = "https://www.deznet.ru";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchOnce(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
        timeout: 50000,
        servername: "www.deznet.ru",
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchOnce(new URL(res.headers.location, url).href).then(
            resolve,
            reject
          );
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
      reject(new Error("timeout"));
    });
  });
}

async function fetchRetry(url, tries = 4) {
  let last;
  for (let t = 1; t <= tries; t++) {
    try {
      return await fetchOnce(url);
    } catch (e) {
      last = e;
      await sleep(800 * t);
    }
  }
  throw last;
}

function strip(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}

function parseProducts(html, categoryPath, categorySlug) {
  const products = [];
  const blocks = html.split(/catalog-block-view__item/i).slice(1);
  for (const raw of blocks) {
    const block = raw.slice(0, 10000);
    const id = (block.match(/data-id="(\d+)"/) || [])[1];
    if (!id) continue;
    const desc =
      (block.match(/itemprop="description"\s+content="([^"]+)"/) || [])[1] ||
      null;
    const hrefM = block.match(
      /href="(\/catalog\/[^"]+\/\d+\/)"[^>]*>([\s\S]*?)<\/a>/i
    );
    const href = hrefM?.[1];
    if (href && href.includes("/filter/")) continue;
    let title = hrefM ? strip(hrefM[2]) : null;
    if (!title && desc) title = desc;
    if (!title || title.length < 2) continue;

    let img =
      (block.match(
        /src="(\/upload\/(?:resize_cache\/)?iblock\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i
      ) || [])[1] || null;
    if (img && !img.startsWith("http")) img = BASE + img;

    products.push({
      bitrixId: id,
      sku: `DZ-${id}`,
      nameRu: title.slice(0, 250),
      nameEn: title.slice(0, 250),
      descriptionRu: (desc || title).slice(0, 2000),
      descriptionEn: (desc || title).slice(0, 2000),
      shortRu: (desc || title).slice(0, 180),
      shortEn: (desc || title).slice(0, 180),
      image: img,
      pageUrl: href ? BASE + href : BASE + categoryPath,
      categoryPath,
      categorySlug,
      slug: `dz-${id}-${slugify(title)}`,
      manufacturer: "REAGENT Partner",
    });
  }
  return products;
}

function save(byId, donePaths, failedPaths) {
  const list = [...byId.values()];
  fs.writeFileSync(outPath, JSON.stringify(list), "utf8"); // compact for size
  fs.writeFileSync(
    progressPath,
    JSON.stringify({
      donePaths: [...donePaths],
      failedPaths: [...failedPaths],
      count: list.length,
      at: new Date().toISOString(),
    }),
    "utf8"
  );
}

async function scrapePage(pagePath, categorySlug, byId) {
  const { status, body } = await fetchRetry(BASE + pagePath);
  if (status !== 200) return 0;
  let added = 0;
  const prods = parseProducts(body, pagePath, categorySlug);
  for (const p of prods) {
    if (!byId.has(p.bitrixId)) {
      byId.set(p.bitrixId, p);
      added++;
    }
  }
  // pagination
  if (prods.length >= 6) {
    for (let n = 2; n <= 12; n++) {
      try {
        const r = await fetchRetry(
          `${BASE}${pagePath}?PAGEN_1=${n}&SIZEN_1=48`
        );
        if (r.status !== 200) break;
        const more = parseProducts(r.body, pagePath, categorySlug);
        if (!more.length) break;
        let pageAdded = 0;
        for (const p of more) {
          if (!byId.has(p.bitrixId)) {
            byId.set(p.bitrixId, p);
            pageAdded++;
            added++;
          }
        }
        if (pageAdded === 0) break;
        await sleep(90);
      } catch {
        break;
      }
    }
  }
  return added;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const catsPath = path.join(outDir, "deznet-categories.json");
  if (!fs.existsSync(catsPath)) {
    throw new Error("Run deznet-scrape-cats.mjs first");
  }
  const cats = JSON.parse(fs.readFileSync(catsPath, "utf8"));

  // ALL leaf categories + roots (products can sit on both)
  const pages = cats
    .filter((c) => c.level >= 1)
    .map((c) => ({ path: c.path, slug: c.slug, level: c.level }))
    // leaves first (more products), then roots
    .sort((a, b) => b.level - a.level || a.path.localeCompare(b.path));

  const byId = new Map();
  const donePaths = new Set();
  const failedPaths = new Set();

  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
      for (const p of prev) if (p?.bitrixId) byId.set(String(p.bitrixId), p);
      console.log("resumed products:", byId.size);
    } catch (e) {
      console.warn("could not resume products", e.message);
    }
  }
  if (fs.existsSync(progressPath)) {
    try {
      const pr = JSON.parse(fs.readFileSync(progressPath, "utf8"));
      // only trust done if we actually have products
      if (byId.size > 0) {
        for (const p of pr.donePaths || []) donePaths.add(p);
      }
      console.log("resumed done pages:", donePaths.size);
    } catch {
      /* ignore */
    }
  }

  console.log("pages total", pages.length, "skip", donePaths.size);

  let i = 0;
  for (const page of pages) {
    i++;
    if (donePaths.has(page.path)) continue;
    try {
      await scrapePage(page.path, page.slug, byId);
      donePaths.add(page.path);
      failedPaths.delete(page.path);
      if (i % 10 === 0 || i === pages.length) {
        save(byId, donePaths, failedPaths);
        console.log(
          `ok ${i}/${pages.length} products=${byId.size} path=${page.path}`
        );
      }
      await sleep(100);
    } catch (e) {
      console.warn("FAIL", page.path, e.message);
      failedPaths.add(page.path);
      // retry later — don't mark done
      await sleep(1500);
    }
  }

  // one more pass on failed
  if (failedPaths.size) {
    console.log("retry failed", failedPaths.size);
    for (const p of [...failedPaths]) {
      const page = pages.find((x) => x.path === p);
      if (!page) continue;
      try {
        await scrapePage(page.path, page.slug, byId);
        donePaths.add(page.path);
        failedPaths.delete(page.path);
        save(byId, donePaths, failedPaths);
        console.log("retry ok", page.path, "total", byId.size);
        await sleep(200);
      } catch (e) {
        console.warn("retry fail", page.path, e.message);
      }
    }
  }

  save(byId, donePaths, failedPaths);
  const list = [...byId.values()];
  const byCat = {};
  for (const p of list) {
    byCat[p.categorySlug] = (byCat[p.categorySlug] || 0) + 1;
  }
  console.log(
    JSON.stringify(
      {
        total: list.length,
        withImage: list.filter((p) => p.image).length,
        categoriesFilled: Object.keys(byCat).length,
        failedLeft: failedPaths.size,
        out: outPath,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
