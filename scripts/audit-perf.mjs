const base = "https://www.reagent.tj";
const paths = [
  "/ru",
  "/ru/catalog",
  "/ru/catalog/reagents",
  "/ru/catalog/vb-immunochemistry",
  "/ru/product/rg-d-0352",
  "/ru/brands/reagent-partner-qb3",
  "/ru/search?q=pcr",
  "/sitemap.xml",
];

async function hit(path) {
  const t0 = Date.now();
  const res = await fetch(base + path, {
    headers: { "User-Agent": "reagent-perf-audit/1.0", "Cache-Control": "no-cache" },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  const buf = await res.arrayBuffer();
  const ms = Date.now() - t0;
  const cache = res.headers.get("x-vercel-cache") || res.headers.get("cf-cache-status") || "-";
  const age = res.headers.get("age") || "-";
  const cc = res.headers.get("cache-control") || "-";
  console.log(
    `${String(res.status).padStart(3)} ${String(ms).padStart(5)}ms  cache=${String(cache).padEnd(6)} age=${String(age).padEnd(5)} bytes=${String(buf.byteLength).padStart(8)}  ${path}`
  );
  console.log(`     cc=${cc}`);
  return ms;
}

console.log("=== PASS 1 (cold-ish) ===");
const pass1 = [];
for (const p of paths) pass1.push(await hit(p));

console.log("\n=== PASS 2 (warm) ===");
const pass2 = [];
for (const p of paths) pass2.push(await hit(p));

const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
console.log("\n=== SUMMARY ===");
console.log("pass1 avg:", avg(pass1), "ms  max:", Math.max(...pass1));
console.log("pass2 avg:", avg(pass2), "ms  max:", Math.max(...pass2));
