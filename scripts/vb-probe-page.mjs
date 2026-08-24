import https from "https";

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetch(new URL(res.headers.location, url).href).then(resolve, reject);
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString("utf8"),
            })
          );
        }
      )
      .on("error", reject);
  });
}

const url = process.argv[2] || "https://vector-best.ru/catalog/biokhimiya/nabory/fermenty/";
const { status, body } = await fetch(url);
console.log("status", status, "len", body.length);
const items = body.split(/class="service-list__item"/i).length - 1;
console.log("service-list items", items);
const skus = [...body.matchAll(/Кат\.\s*№[\s\S]{0,80}?>(D-\d+)/gi)].map((m) => m[1]);
console.log("skus", skus.length, skus.slice(0, 10));
const pager = [...body.matchAll(/PAGEN_\d+=(\d+)/g)].map((m) => m[1]);
console.log("pager", [...new Set(pager)]);
const more = /показать еще|load.?more|bxajax/i.test(body);
console.log("has more?", more);
