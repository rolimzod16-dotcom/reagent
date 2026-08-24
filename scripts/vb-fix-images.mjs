/**
 * For products without real Vector-Best images:
 * 1) Try sibling category images from VB catalog
 * 2) Map keyword → known product-line images from same scrape
 * 3) Last resort: curated medical kit URLs (not random Unsplash)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataPath = path.join(root, "data", "vector-best-products.json");

const list = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Collect real VB images by root category
const poolByRoot = {};
const allReal = [];
for (const p of list) {
  if (p.image && p.image.includes("vector-best.ru") && !p.imageFallback) {
    allReal.push(p.image);
    const r = p.rootSlug || "reagents";
    if (!poolByRoot[r]) poolByRoot[r] = [];
    if (!poolByRoot[r].includes(p.image)) poolByRoot[r].push(p.image);
  }
}

// Prefer product-box style files if filename looks like kit packaging
function scoreImage(url) {
  const f = url.toLowerCase();
  let s = 0;
  if (/print|box|nabor|kit|pack|oblozhka|prevyu|buklet/.test(f)) s += 2;
  if (/webinar|vebinar|slider|banner/.test(f)) s -= 1;
  return s;
}

function pickFor(p, i) {
  const pool = (poolByRoot[p.rootSlug] || allReal).slice();
  pool.sort((a, b) => scoreImage(b) - scoreImage(a));
  if (!pool.length) return null;
  // stable unique-ish pick per sku
  let h = 0;
  for (let c of p.sku) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[(h + i) % pool.length];
}

// Keyword-based preferred images from our own scrape (real VB assets)
function findByNameKeywords(keywords) {
  for (const p of list) {
    if (p.imageFallback || !p.image?.includes("vector-best.ru")) continue;
    const n = (p.nameRu || "").toLowerCase();
    if (keywords.every((k) => n.includes(k.toLowerCase()))) return p.image;
  }
  return null;
}

const KEYWORD_MAP = [
  { skus: ["D-0210", "D-0220"], keys: ["ттг"] },
  { skus: ["D-0213", "D-0217"], keys: ["т4"] },
  { skus: ["D-0211", "D-0221"], keys: ["са-125"] },
  { skus: ["D-0214", "D-0215", "D-0216"], keys: ["пса"] },
  { skus: ["D-0218"], keys: ["пролактин"] },
  { skus: ["D-0212"], keys: ["тпо"] },
  { skus: ["D-0222"], keys: ["т4"] },
  { skus: ["D-2398", "D-2399"], keys: ["мвтс"] },
];

// Known good VB line images for Ultima / PCR when nothing else matches
const ULTIMA_LINE =
  list.find(
    (p) =>
      /Ультима/i.test(p.nameRu) &&
      p.image?.includes("vector-best.ru") &&
      !p.imageFallback
  )?.image || null;

const PCR_LINE =
  list.find(
    (p) =>
      /РеалБест ДНК/i.test(p.nameRu) &&
      p.image?.includes("vector-best.ru") &&
      !p.imageFallback &&
      /buklet|prevyu|print|nabor/i.test(p.image)
  )?.image ||
  list.find(
    (p) =>
      /РеалБест/i.test(p.nameRu) &&
      p.image?.includes("vector-best.ru") &&
      !p.imageFallback
  )?.image ||
  null;

let fixed = 0;
let i = 0;
for (const p of list) {
  if (!p.imageFallback) continue;
  let next = null;

  // 1) keyword map
  for (const m of KEYWORD_MAP) {
    if (m.skus.includes(p.sku)) {
      next = findByNameKeywords(m.keys);
      break;
    }
  }

  // 2) line defaults
  if (!next) {
    if (/Ультима|раствор|триггер/i.test(p.nameRu) && ULTIMA_LINE) next = ULTIMA_LINE;
    if (/РеалБест|MBTC|ДНК/i.test(p.nameRu) && PCR_LINE) next = PCR_LINE;
  }

  // 3) pool from same root
  if (!next) next = pickFor(p, i);

  if (next) {
    p.image = next;
    p.imageFallback = false;
    p.imageSource = "vb-sibling-or-line";
    fixed++;
  }
  i++;
}

fs.writeFileSync(dataPath, JSON.stringify(list, null, 2), "utf8");
const still = list.filter((p) => p.imageFallback).length;
const real = list.filter((p) => p.image?.includes("vector-best.ru")).length;
console.log(
  JSON.stringify(
    { total: list.length, fixed, stillFallback: still, vectorBestImages: real },
    null,
    2
  )
);
