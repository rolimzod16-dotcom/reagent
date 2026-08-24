/**
 * Scrape full category tree from https://www.deznet.ru/catalog/
 * Output: data/deznet-categories.json
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const BASE = "https://www.deznet.ru";

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
          Accept: "text/html",
        },
        timeout: 45000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
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
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromPath(p) {
  const parts = p.split("/").filter(Boolean);
  // catalog / parent / child
  return parts[parts.length - 1] || "cat";
}

/** Parse catalog index: root sections with nested links */
function parseCatalogIndex(html) {
  // Collect all /catalog/xxx/ and /catalog/xxx/yyy/
  const re = /href="(\/catalog\/[a-z0-9_\/]+\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  const byPath = new Map();
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href === "/catalog/") continue;
    if (href.includes("filter") || href.includes("sort")) continue;
    let name = strip(m[2]);
    // remove trailing product counts like "1864"
    name = name.replace(/\s+\d{1,5}\s*$/, "").trim();
    if (!name || name.length < 2 || name.length > 120) continue;
    if (/^ещё|\+|^ещё$/i.test(name)) continue;
    if (!byPath.has(href)) byPath.set(href, name);
  }
  return byPath;
}

function depthOf(catalogPath) {
  return catalogPath.split("/").filter(Boolean).length; // catalog + segs
}

function parentPath(catalogPath) {
  const parts = catalogPath.split("/").filter(Boolean);
  if (parts.length <= 2) return null; // top-level under catalog
  parts.pop();
  return "/" + parts.join("/") + "/";
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("1) Fetch catalog root…");
  const rootPage = await fetch(BASE + "/catalog/");
  if (rootPage.status !== 200) throw new Error("catalog root " + rootPage.status);

  let byPath = parseCatalogIndex(rootPage.body);
  console.log("links from index:", byPath.size);

  // BFS: fetch each top-level category to get full subcats (pages with "Ещё")
  const topLevels = [...byPath.keys()].filter((p) => depthOf(p) === 2);
  console.log("top-level:", topLevels.length);

  let i = 0;
  for (const top of topLevels) {
    i++;
    try {
      const { status, body } = await fetch(BASE + top);
      if (status !== 200) continue;
      const more = parseCatalogIndex(body);
      for (const [href, name] of more) {
        // only under this top
        if (href === top || href.startsWith(top)) {
          if (!byPath.has(href)) byPath.set(href, name);
          else if (name.length > (byPath.get(href) || "").length) {
            byPath.set(href, name);
          }
        }
      }
      if (i % 5 === 0) console.log(`scanned top ${i}/${topLevels.length}, total ${byPath.size}`);
      await sleep(150);
    } catch (e) {
      console.warn("fail", top, e.message);
    }
  }

  // Build tree nodes
  const nodes = [];
  for (const [href, nameRu] of byPath) {
    const parts = href.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    const parent = parentPath(href);
    const level = parts.length - 1; // 1 = root cat
    nodes.push({
      path: href,
      slug,
      nameRu,
      nameEn: nameRu, // keep RU as EN fallback (medical terms)
      parentPath: parent,
      level,
      source: "deznet",
      image: null,
    });
  }

  // sort by path
  nodes.sort((a, b) => a.path.localeCompare(b.path));

  // Map parentPath of top-level to null
  for (const n of nodes) {
    if (n.level === 1) n.parentPath = null;
  }

  const outPath = path.join(outDir, "deznet-categories.json");
  fs.writeFileSync(outPath, JSON.stringify(nodes, null, 2), "utf8");

  const roots = nodes.filter((n) => n.level === 1).length;
  const leaves = nodes.filter((n) => n.level >= 2).length;
  console.log(
    JSON.stringify(
      {
        total: nodes.length,
        roots,
        subcategories: leaves,
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
