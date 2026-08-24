import https from "https";

function fetch(url) {
  return new Promise((res, rej) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (r) => {
        const c = [];
        r.on("data", (d) => c.push(d));
        r.on("end", () => res(Buffer.concat(c).toString("utf8")));
      })
      .on("error", rej);
  });
}

const url =
  process.argv[2] ||
  "https://vector-best.ru/catalog/biokhimiya/nabory/fermenty/";
const body = await fetch(url);
const items = body.split(/class="service-list__item"/i).slice(1);
console.log("items", items.length);
console.log("---CARD0---");
console.log(items[0]?.slice(0, 3500));
console.log("---keys---");
const keys = [
  ...items[0].matchAll(/service-card__key[^>]*>([\s\S]*?)<\/div>/gi),
].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
console.log(keys);
