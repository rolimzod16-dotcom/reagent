import https from "https";
import fs from "fs";

function fetch(url) {
  return new Promise((res, rej) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          },
        },
        (r) => {
          if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
            return fetch(new URL(r.headers.location, url).href).then(res, rej);
          }
          const c = [];
          r.on("data", (d) => c.push(d));
          r.on("end", () =>
            res({ s: r.statusCode, b: Buffer.concat(c).toString("utf8") })
          );
        }
      )
      .on("error", rej);
  });
}

const url =
  process.argv[2] ||
  "https://www.deznet.ru/catalog/oborudovanie_diagnosticheskoe/";
const r = await fetch(url);
console.log("status", r.s, "len", r.b.length);
fs.writeFileSync("data/deznet-sample.html", r.b);

const patterns = [
  "catalog-block",
  "product-item",
  "catalog-item",
  "product-card",
  "bx_catalog",
  "item-title",
  "product-title",
  "catalog_item",
  "data-entity",
  "product_id",
];
for (const p of patterns) {
  const n = (r.b.match(new RegExp(p, "gi")) || []).length;
  if (n) console.log(p, n);
}

// all hrefs under catalog with depth
const hrefs = [
  ...r.b.matchAll(/href="(\/catalog\/[^"#?]+)"/gi),
].map((m) => m[1]);
const uniq = [...new Set(hrefs)];
const byDepth = {};
for (const h of uniq) {
  const d = h.split("/").filter(Boolean).length;
  byDepth[d] = (byDepth[d] || 0) + 1;
}
console.log("byDepth", byDepth);
console.log(
  "depth>=4 sample",
  uniq.filter((h) => h.split("/").filter(Boolean).length >= 4).slice(0, 25)
);

// images
const imgs = [
  ...r.b.matchAll(/src="(\/upload\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi),
].map((m) => m[1]);
console.log("imgs", imgs.length, imgs.slice(0, 5));

// pagination
const pages = [
  ...r.b.matchAll(/PAGEN_\d+=(\d+)/g),
  ...r.b.matchAll(/page[=-](\d+)/gi),
];
console.log("pagination hints", pages.slice(0, 10).map((m) => m[0]));
