/**
 * Scrape ThreeLab laboratory EQUIPMENT + CONSUMABLES (posuda).
 * Category path is taken from the product URL, not the mega-menu page.
 * Images: only threelab.ru/upload/iblock (no other dealer hosts).
 *
 *   node scripts/tl-scrape-lab.mjs
 *   node scripts/tl-scrape-lab.mjs --max=200
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data", "threelab-lab.json");
const STATE = path.join(root, "data", "threelab-lab-state.json");
const OLD_EQ = path.join(root, "data", "threelab-equipment.json");

const BASE = "https://threelab.ru";
const SEEDS = [
  "/catalog/laboratornoe-oborudovanie/",
  "/catalog/laboratornaya-posuda/",
];
const MAX = Number(
  (process.argv.find((a) => a.startsWith("--max=")) || "").split("=")[1] || 0
);
const DELAY_MS = 280;

const SKIP_CAT = [
  "analiz-kachestva-vina",
  "sokovyzhimalki-valovoy-press",
  "evtanaziya-laboratornykh-zhivotnykh",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function absUrl(u) {
  if (!u) return null;
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return BASE + u;
  return BASE + "/" + u;
}

function stripHtml(html = "") {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeImage(u) {
  const abs = absUrl(u);
  if (!abs) return null;
  const low = abs.toLowerCase();
  if (!low.includes("threelab.ru/upload/iblock/")) return null;
  if (/logo|watermark|banner|favicon|sprite|icon[_-]|placeholder/i.test(low)) {
    return null;
  }
  return abs;
}

function pillarOf(p) {
  if (p.includes("/laboratornaya-posuda/")) {
    if (p.includes("/dozatory/") || p.includes("/pipetatory/")) return "equipment";
    return "consumables";
  }
  return "equipment";
}

function categoryPathFromProduct(productPath) {
  const parts = productPath.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length < 4) return "/" + parts.join("/") + "/";
  parts.pop();
  return "/" + parts.join("/") + "/";
}

function skipCat(href) {
  return SKIP_CAT.some((s) => href.includes("/" + s + "/"));
}

async function fetchHtml(url, attempt = 1) {
  const abs = url.startsWith("http") ? url : BASE + url;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(abs, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });
    return { status: res.status, body: await res.text(), url: res.url };
  } catch (e) {
    if (attempt < 3) {
      await sleep(800 * attempt);
      return fetchHtml(url, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function extractProducts(body, pagePath) {
  const out = [];
  const re =
    /class="[^"]*item-title[^"]*"[\s\S]{0,400}?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(body))) {
    const href = m[1].split("?")[0];
    const nameRu = stripHtml(m[2]);
    if (!href.startsWith("/catalog/")) continue;
    if (!nameRu || nameRu.length < 4) continue;
    const parts = href.replace(/\/$/, "").split("/").filter(Boolean);
    if (parts.length < 4) continue;

    const before = body.slice(Math.max(0, m.index - 14000), m.index);
    const imgs = [
      ...before.matchAll(
        /(?:data-src|src)="(\/upload\/iblock\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi
      ),
    ];
    const image = imgs.length ? safeImage(imgs[imgs.length - 1][1]) : null;
    const catPath = categoryPathFromProduct(href);

    out.push({
      sourceUrl: absUrl(href),
      path: href,
      nameRu,
      nameEn: nameRu,
      image,
      categoryPath: catPath,
      pagePath,
      pillar: pillarOf(href),
      slug:
        "tl-" +
        nameRu
          .toLowerCase()
          .replace(/ё/g, "e")
          .replace(/[^a-zа-я0-9]+/gi, "-")
          .slice(0, 50),
    });
  }
  const seen = new Set();
  return out.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}

function childCats(body, current) {
  const prefix = current.replace(/\/$/, "") + "/";
  const hrefs = [
    ...body.matchAll(/href="(\/catalog\/[^"#?]{3,160}\/)"/gi),
  ].map((m) => m[1].split("?")[0]);
  const out = [];
  const seen = new Set();
  for (const h of hrefs) {
    if (!h.startsWith(prefix) || h === current) continue;
    if (skipCat(h)) continue;
    const rest = h.slice(prefix.length).replace(/\/$/, "");
    if (!rest || rest.includes("/")) continue;
    if (rest.length > 70) continue;
    const digits = (rest.match(/\d/g) || []).length;
    if (digits >= 4) continue;
    const depth = h.replace(/\/$/, "").split("/").filter(Boolean).length;
    if (depth > 4) continue;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

function maxPage(body) {
  const pages = [...body.matchAll(/PAGEN_1=(\d+)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

function pageTitle(body) {
  const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return stripHtml(h1?.[1] || "").slice(0, 80);
}

function loadState() {
  try {
    if (fs.existsSync(STATE)) return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    /* ignore */
  }
  const products = [];
  if (fs.existsSync(OLD_EQ)) {
    try {
      for (const p of JSON.parse(fs.readFileSync(OLD_EQ, "utf8"))) {
        if (!p.path) continue;
        products.push({
          ...p,
          categoryPath: categoryPathFromProduct(p.path),
          pillar: "equipment",
          image: safeImage(p.image),
        });
      }
    } catch {
      /* ignore */
    }
  }
  return { queue: [...SEEDS], visited: [], products, labels: {} };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state));
  fs.writeFileSync(OUT, JSON.stringify(state.products, null, 2));
}

async function main() {
  const state = loadState();
  const visited = new Set(state.visited || []);
  const queue = [...(state.queue || SEEDS)].filter((h) => {
    const last = String(h).replace(/\/$/, "").split("/").pop() || "";
    const depth = String(h).replace(/\/$/, "").split("/").filter(Boolean).length;
    const digits = (last.match(/\d/g) || []).length;
    if (depth > 4) return false;
    if (last.length > 70) return false;
    if (digits >= 4) return false;
    return true;
  });
  const byPath = new Map((state.products || []).map((p) => [p.path, p]));
  const labels = { ...(state.labels || {}) };

  console.log(
    "resume products=",
    byPath.size,
    "queue=",
    queue.length,
    "visited=",
    visited.size
  );

  while (queue.length) {
    if (MAX && byPath.size >= MAX) break;
    const catPath = queue.shift();
    if (!catPath || visited.has(catPath) || skipCat(catPath)) continue;
    visited.add(catPath);

    try {
      let page = 1;
      let last = 1;
      do {
        const pageUrl = page === 1 ? catPath : `${catPath}?PAGEN_1=${page}`;
        const { status, body } = await fetchHtml(pageUrl);
        await sleep(DELAY_MS);
        if (status !== 200) {
          console.warn("skip", status, pageUrl);
          break;
        }

        if (page === 1) {
          const title = pageTitle(body);
          if (title) labels[catPath] = title;
          for (const child of childCats(body, catPath)) {
            if (!visited.has(child) && !queue.includes(child)) queue.push(child);
          }
          const kids = childCats(body, catPath);
          last = kids.length > 5 ? 1 : Math.min(maxPage(body), 12);
        }

        const products = extractProducts(body, catPath);
        for (const p of products) {
          const prev = byPath.get(p.path);
          if (!prev) byPath.set(p.path, p);
          else if (!prev.image && p.image) prev.image = p.image;
        }

        console.log(
          `ok ${catPath} p${page}/${last} +${products.length} total=${byPath.size} q=${queue.length}`
        );

        if (page % 4 === 0 || products.length) {
          state.queue = queue;
          state.visited = [...visited];
          state.products = [...byPath.values()];
          state.labels = labels;
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
  state.labels = labels;
  saveState(state);
  const eq = state.products.filter((p) => p.pillar === "equipment").length;
  const cons = state.products.filter((p) => p.pillar === "consumables").length;
  const imgs = state.products.filter((p) => p.image).length;
  console.log(
    "DONE products=",
    state.products.length,
    "eq=",
    eq,
    "cons=",
    cons,
    "images=",
    imgs,
    "→",
    OUT
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
