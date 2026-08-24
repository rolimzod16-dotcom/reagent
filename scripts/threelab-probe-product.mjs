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
            "Accept-Language": "ru",
          },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve({ status: res.statusCode, body: d }));
        }
      )
      .on("error", reject);
  });
}

const url =
  process.argv[2] ||
  "https://threelab.ru/catalog/laboratornoe-oborudovanie/tsentrifugi/tsentrifugi-mikro-do-48x1-5-ml/tsentrifuga-15000-ob-min-21380-g-s-rotorom-24-1-5-2-0-ml-d3024-dlab-75002465-thermo-fs-423192-komp24/";

const { status, body } = await get(url);
console.log("status", status, "len", body.length);
const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
console.log("h1", h1?.[1]?.replace(/<[^>]+>/g, "").trim());
const art = body.match(/Артикул[\s\S]{0,40}?([A-Za-z0-9][\w\-./]{2,})/i);
console.log("art", art?.[1]);
const brand = body.match(/Бренд[\s\S]{0,80}?>([^<]{2,80})</i);
console.log("brand", brand?.[1]?.trim());
const desc = body.match(
  /itemprop="description"[^>]*>([\s\S]*?)<\/div>/i
) || body.match(/detail-text[\s\S]*?>([\s\S]{0,500})</i);
console.log(
  "desc",
  desc?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)
);
const og = body.match(/property="og:image"\s+content="([^"]+)"/i);
console.log("og:image", og?.[1]);
