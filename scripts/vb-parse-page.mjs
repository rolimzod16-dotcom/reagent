import fs from "fs";
import https from "https";

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(new URL(res.headers.location, url).href).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") })
        );
      })
      .on("error", reject);
  });
}

function strip(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse product cards from a listing page */
export function parseProducts(html, pageUrl) {
  const products = [];
  // Split by service-card blocks that contain D- catalog numbers
  const blocks = html.split(/class="service-card"/i).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 2500);
    const skuM = chunk.match(/D-\d{3,5}/);
    if (!skuM) continue;
    const sku = skuM[0];
    const titleM = chunk.match(
      /service-card__title[^>]*>([\s\S]*?)<\/div>/i
    );
    const name = titleM ? strip(titleM[1]) : "";
    if (!name || name.length < 3) continue;
    const imgM = chunk.match(/src="(\/upload\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    const linkM = chunk.match(/href="(\/catalog\/[^"]+#[^"]+)"/i)
      || chunk.match(/href="(\/catalog\/[^"#]+\/)"/i);
    const qtyM = chunk.match(/Количество определений[\s\S]*?service-card__text[^>]*>([\s\S]*?)<\/div>/i)
      || chunk.match(/service-card__text[^>]*>([\s\S]{1,40})<\/div>/i);
    products.push({
      sku,
      name,
      image: imgM ? "https://vector-best.ru" + imgM[1] : null,
      link: linkM ? "https://vector-best.ru" + linkM[1].split("#")[0] : pageUrl,
      qty: qtyM ? strip(qtyM[1]) : null,
    });
  }
  // dedupe by sku
  const map = new Map();
  for (const p of products) {
    if (!map.has(p.sku)) map.set(p.sku, p);
  }
  return [...map.values()];
}

/** Extract subcategory links from catalog menu / page */
export function parseCategoryLinks(html) {
  const links = [
    ...html.matchAll(/href="(\/catalog\/[a-z0-9\-\/]+\/)"/gi),
  ].map((m) => m[1]);
  return [...new Set(links)].filter(
    (l) =>
      !l.endsWith("/dokumentatsiya/") &&
      !l.endsWith("/programmnoe-obespechenie/") &&
      l !== "/catalog/"
  );
}

const isMain =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("vb-parse-page.mjs");
if (isMain) {
  const url =
    process.argv[2] ||
    "https://vector-best.ru/catalog/ptsr/nabory/respiratornye-infektsii/";
  const { body } = await fetch(url);
  const products = parseProducts(body, url);
  console.log("products", products.length);
  console.log(JSON.stringify(products.slice(0, 5), null, 2));
}
