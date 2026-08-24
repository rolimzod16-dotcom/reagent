const base = "https://www.reagent.tj";
const paths = [
  "/",
  "/ru",
  "/en",
  "/ru/catalog",
  "/ru/search?q=pcr",
  "/admin",
  "/admin/products",
  "/robots.txt",
  "/sitemap.xml",
  "/api/admin/products",
  "/api/admin/categories",
  "/api/admin/inquiries",
  "/api/auth/me",
];

async function hit(path, headers = {}) {
  const url = base + path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    const ms = Date.now() - t0;
    const snippet = text.replace(/\s+/g, " ").slice(0, 80);
    console.log(
      `${res.status} ${ms}ms ${path} bytes=${text.length} :: ${snippet}`
    );
    return { status: res.status, text };
  } catch (e) {
    console.log(`ERR ${path} ${e.message}`);
    return null;
  }
}

console.log("=== PUBLIC ===");
for (const p of paths) await hit(p);

console.log("\n=== ADMIN API without key (expect 401) ===");
await hit("/api/admin/products");
await hit("/api/admin/inquiries");

console.log("\n=== Catalog page product markers ===");
const cat = await hit("/ru/catalog");
if (cat?.text) {
  const hasProduct =
    /product\//i.test(cat.text) || /Запросить|Request|SKU|артикул/i.test(cat.text);
  const empty =
    /нет товар|no products|каталог пуст|0 товар/i.test(cat.text) ||
    cat.text.length < 2000;
  console.log("catalog_looks_has_products:", hasProduct, "maybe_empty:", empty);
}
