const r = await fetch("https://reagent-eight.vercel.app/ru/catalog/reagents");
const t = await r.text();
const clean = t
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/https:\/\/vector-best[^"'\s]*/gi, "");
const re = /Вектор[^<"']{0,50}|Vector-Best[^<"']{0,50}|ВЕКТОР[^<"']{0,50}/gi;
console.log("in raw:", [...new Set([...t.matchAll(re)].map((m) => m[0]))]);
console.log("after strip image urls:", [
  ...new Set([...clean.matchAll(re)].map((m) => m[0])),
]);
const p = await fetch("https://reagent-eight.vercel.app/ru/product/rg-d-3848");
const pt = await p.text();
console.log("product", p.status, {
  hasVB: /Вектор|Vector-Best|ВЕКТОР/i.test(
    pt.replace(/https:\/\/vector-best[^"'\s]*/gi, "")
  ),
  name: /РеалБест|СМАнео/i.test(pt),
});
