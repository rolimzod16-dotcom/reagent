import https from "https";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "ru-RU,ru;q=0.9",
          },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () =>
            resolve({ status: res.statusCode, body: d, headers: res.headers })
          );
        }
      )
      .on("error", reject);
  });
}

const url =
  process.argv[2] ||
  "https://threelab.ru/catalog/laboratornoe-oborudovanie/tsentrifugi/tsentrifugi-mikro-do-48x1-5-ml/";

const { status, body } = await get(url);
console.log("status", status, "len", body.length);

const hrefs = [
  ...body.matchAll(/href="(\/catalog\/laboratornoe-oborudovanie\/[^"#?]+)"/gi),
].map((m) => m[1]);
console.log("unique catalog hrefs", new Set(hrefs).size);
console.log([...new Set(hrefs)].slice(0, 20));

// Bitrix item cards
const cardRe =
  /<div[^>]*class="[^"]*catalog-block-view__item[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
const cards = body.match(cardRe) || [];
console.log("cards approx", cards.length);

const titleAnchors = [
  ...body.matchAll(
    /class="[^"]*item-title[^"]*"[\s\S]{0,200}?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  ),
];
console.log(
  "item-title",
  titleAnchors.slice(0, 8).map((m) => ({
    href: m[1],
    name: m[2].replace(/<[^>]+>/g, "").trim(),
  }))
);

const dark = [
  ...body.matchAll(/data-src="([^"]+)"/gi),
].map((m) => m[1]);
console.log("data-src sample", dark.slice(0, 10));

const pager = body.match(/PAGEN_1=(\d+)/g) || [];
console.log("pager hints", [...new Set(pager)].slice(0, 10));
const nav = body.match(/навигац[\s\S]{0,200}|NAV_RESULT[\s\S]{0,120}/i);
console.log("nav snippet", nav?.[0]?.slice(0, 150));
