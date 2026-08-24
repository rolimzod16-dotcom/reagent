const base = "https://reagent-eight.vercel.app";

async function check(path) {
  const r = await fetch(base + path, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const t = await r.text();
  const productLinks = [
    ...new Set(
      [...t.matchAll(/href="(\/ru\/product\/[^"]+)"/g)].map((m) => m[1])
    ),
  ];
  const vbImgs = [
    ...new Set(
      [...t.matchAll(/https:\/\/vector-best\.ru\/upload\/[^\s"']+/g)].map(
        (m) => m[0]
      )
    ),
  ];
  const resultsMatch = t.match(/(\d+)\s*(позиц|товар|result)/i);
  const hasVB = /Вектор|РеалБест|Ультима|D-\d{4}/i.test(t);
  console.log(
    JSON.stringify({
      path,
      status: r.status,
      products: productLinks.length,
      sample: productLinks.slice(0, 3),
      vbImages: vbImgs.length,
      resultsHint: resultsMatch?.[0] || null,
      hasVB,
    })
  );
  return productLinks;
}

const catalogLinks = await check("/ru/catalog");
const reagentsLinks = await check("/ru/catalog/reagents");
await check("/ru/catalog/vb-ptsr");
await check("/ru/brands");

const first = reagentsLinks[0] || catalogLinks[0];
if (first) {
  const r = await fetch(base + first);
  const t = await r.text();
  console.log(
    JSON.stringify({
      productPage: first,
      status: r.status,
      hasImage: /vector-best\.ru|unsplash|cloudinary/i.test(t),
      hasQuote: /запросить|quote|заявк/i.test(t),
      hasSku: /D-\d{4}|Кат/i.test(t),
    })
  );
}
