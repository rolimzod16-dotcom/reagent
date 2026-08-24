import fs from "fs";
import https from "https";
import http from "http";

function fetch(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(new URL(res.headers.location, url).href).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      })
      .on("error", reject);
  });
}

const url = process.argv[2] || "https://vector-best.ru/catalog/ptsr/nabory/respiratornye-infektsii/";
const { status, body } = await fetch(url);
console.log("status", status, "len", body.length);
fs.writeFileSync("vb-sample.html", body);

// product table rows
const names = [...body.matchAll(/class="[^"]*product[^"]*"[^>]*>[\s\S]{0,200}/gi)].slice(0, 5);
console.log("product class samples", names.length);

// catalog numbers D-xxxx
const cats = [...body.matchAll(/D-\d{3,5}/g)].map((m) => m[0]);
console.log("catalog nos", [...new Set(cats)].slice(0, 30));

// table structure
const tr = [...body.matchAll(/<tr[^>]*class="([^"]*)"/gi)].map((m) => m[1]);
console.log("tr classes", [...new Set(tr)].slice(0, 20));

// links with bx_
const bx = [...body.matchAll(/href="([^"]*#bx_[^"]+)"/gi)].map((m) => m[1]);
console.log("bx links", [...new Set(bx)].slice(0, 15));

// images
const imgs = [...body.matchAll(/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)].map((m) => m[1]);
console.log("imgs", [...new Set(imgs)].slice(0, 20));

// item names near cat numbers
const rows = [...body.matchAll(/D-\d{3,5}[\s\S]{0,400}/g)].slice(0, 3);
console.log("row sample", rows[0]?.[0]?.replace(/\s+/g, " ").slice(0, 300));
