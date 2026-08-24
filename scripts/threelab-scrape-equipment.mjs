/**
 * Scrape laboratory EQUIPMENT from threelab.ru (no reagents/glassware).
 * Resumable JSON → data/threelab-equipment.json
 *
 * Usage:
 *   node scripts/threelab-scrape-equipment.mjs
 *   node scripts/threelab-scrape-equipment.mjs --max=500
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "data", "threelab-equipment.json");
const STATE = path.join(root, "data", "threelab-equipment-state.json");

const BASE = "https://threelab.ru";
const ROOT = "/catalog/laboratornoe-oborudovanie/";
const MAX = Number(
  (process.argv.find((a) => a.startsWith("--max=")) || "").split("=")[1] || 0
);
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(urlPath) {
  const url = urlPath.startsWith("http") ? urlPath : BASE + urlPath;
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; REAGENT-bot/1.0; +https://reagent.tj)",
          "Accept-Language": "ru-RU,ru;q=0.9",
          Accept: "text/html",
        },
        timeout: 30000,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const loc = res.headers.location.startsWith("http")
            ? res.headers.location
            : BASE + res.headers.location;
          res.resume();
          return resolve(get(loc));
        }
        let d = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (d += c));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, body: d, url })
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

function absUrl(u) {
  if (!u) return null;
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return BASE + u;
  return BASE + "/" + u;
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
    .slice(0, 70);
}

function stripHtml(html = "") {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractProducts(body, categoryPath) {
  const out = [];
  const re =
    /class="[^"]*item-title[^"]*"[\s\S]{0,240}?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(body))) {
    const href = m[1];
    const nameRu = stripHtml(m[2]);
    if (!href.includes("/catalog/laboratornoe-oborudovanie/")) continue;
    if (!nameRu || nameRu.length < 4) continue;
    // skip pure category index links (short path depth often categories)
    const parts = href.replace(/\/$/, "").split("/").filter(Boolean);
    if (parts.length < 4) continue;

    // find nearest image before this match
    const before = body.slice(Math.max(0, m.index - 2500), m.index);
    const imgs = [
      ...before.matchAll(
        /(?:data-src|src)="(\/upload\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi
      ),
    ];
    const image = imgs.length ? absUrl(imgs[imgs.length - 1][1]) : null;

    const slugBase = slugify(nameRu) || "tl-item";
    out.push({
      sourceUrl: absUrl(href),
      path: href,
      nameRu,
      nameEn: nameRu,
      image,
      categoryPath,
      slug: `tl-${slugBase}`,
    });
  }
  // dedupe within page
  const seen = new Set();
  return out.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}

function extractChildLinks(body) {
  const links = [
    ...body.matchAll(
      /href="(\/catalog\/laboratornoe-oborudovanie\/[^"#?]+\/)"/gi
    ),
  ].map((m) => m[1]);
  return [...new Set(links)].filter(
    (h) => h.startsWith("/catalog/laboratornoe-oborudovanie/") && h !== ROOT
  );
}

function maxPage(body) {
  const pages = [...body.matchAll(/PAGEN_1=(\d+)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

function loadState() {
  try {
    if (fs.existsSync(STATE)) return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    /* ignore */
  }
  return { queue: [ROOT], visited: [], products: [] };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 0));
  fs.writeFileSync(OUT, JSON.stringify(state.products, null, 2));
}

async function main() {
  const state = loadState();
  const visited = new Set(state.visited || []);
  const queue = [...(state.queue || [ROOT])];
  const byPath = new Map((state.products || []).map((p) => [p.path, p]));

  console.log(
    "resume products=",
    byPath.size,
    "queue=",
    queue.length,
    "visited=",
    visited.size,
    "max=",
    MAX || "∞"
  );

  while (queue.length) {
    if (MAX && byPath.size >= MAX) break;
    const catPath = queue.shift();
    if (!catPath || visited.has(catPath)) continue;
    visited.add(catPath);

    try {
      let page = 1;
      let last = 1;
      do {
        const pageUrl =
          page === 1 ? catPath : `${catPath}?PAGEN_1=${page}`;
        const { status, body } = await get(pageUrl);
        await sleep(DELAY_MS);
        if (status !== 200) {
          console.warn("skip", status, pageUrl);
          break;
        }

        const products = extractProducts(body, catPath);
        for (const p of products) {
          if (!byPath.has(p.path)) byPath.set(p.path, p);
        }

        // enqueue child categories from first page
        if (page === 1) {
          for (const child of extractChildLinks(body)) {
            if (!visited.has(child) && !queue.includes(child)) queue.push(child);
          }
          last = maxPage(body);
        }

        console.log(
          `ok ${catPath} p${page}/${last} +${products.length} total=${byPath.size} queue=${queue.length}`
        );

        if (page % 5 === 0 || products.length) {
          state.queue = queue;
          state.visited = [...visited];
          state.products = [...byPath.values()];
          saveState(state);
        }

        page++;
      } while (page <= last && (!MAX || byPath.size < MAX));
    } catch (e) {
      console.warn("error", catPath, e.message || e);
    }
  }

  state.queue = queue;
  state.visited = [...visited];
  state.products = [...byPath.values()];
  saveState(state);
  console.log("DONE products=", state.products.length, "→", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
