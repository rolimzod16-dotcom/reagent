import https from "https";

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
          r.on("end", () => res(Buffer.concat(c).toString("utf8")));
        }
      )
      .on("error", rej);
  });
}

const url =
  "https://www.deznet.ru/catalog/oborudovanie_diagnosticheskoe/elektrokardiografy/";
const b = await fetch(url);
const blocks = b.split("catalog-block-view__item").slice(1, 4);
for (const bl of blocks) {
  const id = (bl.match(/data-id="(\d+)"/) || [])[1];
  const desc = (bl.match(/itemprop="description" content="([^"]+)"/) || [])[1];
  const hrefM = bl.match(
    /item-title[\s\S]{0,300}?href="(\/catalog\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i
  );
  const img = (bl.match(/src="(\/upload\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) ||
    [])[1];
  console.log({
    id,
    desc,
    href: hrefM?.[1],
    title: hrefM?.[2]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    img: img?.slice(0, 100),
  });
}
console.log("PAGEN", (b.match(/PAGEN_\d+=\d+/g) || []).slice(0, 15));
console.log("show more", /Показать ещё|Показать еще|load_more|ajax_get_more/i.test(b));
// count products on page
console.log("product ids", (b.match(/data-id="(\d+)"/g) || []).length);
// page size in nav
const nav = b.match(/class="nums"[\s\S]{0,500}/);
console.log("nums", nav?.[0]?.slice(0, 300));
