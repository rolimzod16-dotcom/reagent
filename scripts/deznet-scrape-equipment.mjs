/**
 * Scrape medical EQUIPMENT products from deznet.ru
 * Resumable → data/deznet-equipment-products.json
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const outPath = path.join(outDir, "deznet-equipment-products.json");
const progressPath = path.join(outDir, "deznet-equipment-progress.json");
const BASE = "https://www.deznet.ru";

const EQUIPMENT_ROOTS = new Set([
  "oborudovanie_diagnosticheskoe",
  "oborudovanie_dlya_dezinfektsii_i_sterilizatsii",
  "reanimatsionnoe_oborudovanie",
  "oborudovanie_terapevticheskoe",
  "hirurgicheskoe_oborudovanie_i_instrumenty",
  "oborudovanie_endoskopicheskoe",
  "laboratoriya",
  "meditsinskaya_mebel",
  "pribory_izmeritelnye",
  "kosmetologicheskoe_oborudovanie",
  "obespechenie_byta_i_funktsionirovaniya",
  "transportirovka_patsientov",
  "instrumenty",
  "stomatologiya",
  "emkosti_dlya_sterilizatsii",
  "dispensery_i_dozatory",
]);

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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
          Accept: "text/html",
        },
        timeout: 45000,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetch(new URL(res.headers.location, url).href).then(
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

function strip(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
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
    .slice(0, 60);
}

function parseProducts(html, categoryPath, categorySlug) {
  const products = [];
  const blocks = html.split(/catalog-block-view__item/i).slice(1);
  for (const raw of blocks) {
    const block = raw.slice(0, 8000);
    const id = (block.match(/data-id="(\d+)"/) || [])[1];
    if (!id) continue;
    const desc =
      (block.match(/itemprop="description"\s+content="([^"]+)"/) || [])[1] ||
      null;
    const hrefM = block.match(
      /href="(\/catalog\/[^"]+\/\d+\/)"[^>]*>([\s\S]*?)<\/a>/i
    );
    const href = hrefM?.[1] || null;
    if (href && href.includes("/filter/")) continue;
    let title = hrefM ? strip(hrefM[2]) : null;
    if (!title && desc) title = desc;
    if (!title) continue;

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
      descriptionRu: desc || title,
      descriptionEn: desc || title,
      shortRu: (desc || title).slice(0, 180),
      shortEn: (desc || title).slice(0, 180),
      image: img,
      pageUrl: href ? BASE + href : BASE + categoryPath,
      categoryPath,
      categorySlug,
      slug: `dz-${id}-${slugify(title).slice(0, 40)}`,
      manufacturer: "REAGENT Partner",
    });
  }
  return products;
}

function save(byId, donePaths) {
  const list = [...byId.values()];
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), "utf8");
  fs.writeFileSync(
    progressPath,
    JSON.stringify({ donePaths: [...donePaths], count: list.length }),
    "utf8"
  );
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const cats = JSON.parse(
    fs.readFileSync(path.join(outDir, "deznet-categories.json"), "utf8")
  );

  const leafPaths = cats.filter((c) => {
    if (c.level === 2 && c.parentPath) {
      const rootSlug = c.parentPath.split("/").filter(Boolean)[1];
      return EQUIPMENT_ROOTS.has(rootSlug);
    }
    return false;
  });
  const rootPaths = cats.filter(
    (c) => c.level === 1 && EQUIPMENT_ROOTS.has(c.slug)
  );
  const pages = [
    ...rootPaths.map((c) => ({ path: c.path, slug: c.slug })),
    ...leafPaths.map((c) => ({ path: c.path, slug: c.slug })),
  ];

  const byId = new Map();
  const donePaths = new Set();

  // resume
  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
      for (const p of prev) if (p.bitrixId) byId.set(p.bitrixId, p);
      console.log("resumed products:", byId.size);
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(progressPath)) {
    try {
      const pr = JSON.parse(fs.readFileSync(progressPath, "utf8"));
      for (const p of pr.donePaths || []) donePaths.add(p);
      console.log("resumed pages done:", donePaths.size);
    } catch {
      /* ignore */
    }
  }

  console.log("equipment pages to scan:", pages.length, "already", donePaths.size);

  let i = 0;
  for (const page of pages) {
    i++;
    if (donePaths.has(page.path)) continue;
    try {
      const { status, body } = await fetch(BASE + page.path);
      if (status === 200) {
        const prods = parseProducts(body, page.path, page.slug);
        for (const p of prods) {
          if (!byId.has(p.bitrixId)) byId.set(p.bitrixId, p);
        }
        if (prods.length >= 8) {
          for (let pageNum = 2; pageNum <= 6; pageNum++) {
            try {
              const r2 = await fetch(
                BASE + page.path + `?PAGEN_1=${pageNum}&SIZEN_1=40`
              );
              if (r2.status !== 200) break;
              const more = parseProducts(r2.body, page.path, page.slug);
              if (!more.length) break;
              let added = 0;
              for (const p of more) {
                if (!byId.has(p.bitrixId)) {
                  byId.set(p.bitrixId, p);
                  added++;
                }
              }
              if (added === 0) break;
              await sleep(80);
            } catch {
              break;
            }
          }
        }
      }
      donePaths.add(page.path);
      if (i % 15 === 0 || i === pages.length) {
        save(byId, donePaths);
        console.log(`scanned ${i}/${pages.length}, products ${byId.size}`);
      }
      await sleep(70);
    } catch (e) {
      console.warn("fail", page.path, e.message);
      // do NOT mark done — retry next run
      await sleep(500);
    }
  }

  save(byId, donePaths);
  console.log(
    JSON.stringify(
      {
        total: byId.size,
        withImage: [...byId.values()].filter((p) => p.image).length,
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
