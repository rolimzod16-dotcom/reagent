import fs from "fs";
import https from "https";

const env = fs.readFileSync(".env", "utf8");
const admin = (env.match(/^ADMIN_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, "");
const BASE = "https://www.reagent.tj";

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      BASE + path,
      {
        headers: { "User-Agent": "reagent-verify", ...headers },
        timeout: 40000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + path));
    });
  });
}

const catalog = await get("/ru/catalog");
console.log("catalog", catalog.status, catalog.body.length);
const checks = [
  "Реагенты для лабораторных исследований",
  "Лабораторное оборудование",
  "Расходники",
  "Бумага для диагностического оборудования",
  "Все товары",
  "подкатегорий",
];
for (const s of checks) {
  console.log((catalog.body.includes(s) ? "OK  " : "MISS") + " " + s);
}

const cats = JSON.parse(
  (await get("/api/admin/categories", { "x-admin-key": admin })).body
);
const tree = cats.tree || [];
console.log("admin cats", cats.total, "roots", tree.length);
console.log("admin first 10:");
for (const n of tree.slice(0, 10)) {
  console.log(
    ` - ${n.nameRu} | subs ${n.children.length} | goods ${n.subtreeCount}`
  );
}
console.log("admin last 3:");
for (const n of tree.slice(-3)) {
  console.log(
    ` - ${n.nameRu} | subs ${n.children.length} | goods ${n.subtreeCount}`
  );
}

const prods = JSON.parse(
  (await get("/api/admin/products?perPage=5", { "x-admin-key": admin })).body
);
console.log(
  "admin products total",
  prods.total,
  "shown",
  (prods.products || []).length,
  "pages",
  prods.pages
);

const rid = tree[0]?.id;
if (rid) {
  const sub = JSON.parse(
    (
      await get(`/api/admin/products?perPage=5&categoryId=${rid}`, {
        "x-admin-key": admin,
      })
    ).body
  );
  console.log("reagents subtree products", sub.total);
}

const lab = tree.find((n) => n.slug === "laboratoriya");
if (lab) {
  const sub = JSON.parse(
    (
      await get(`/api/admin/products?perPage=5&categoryId=${lab.id}`, {
        "x-admin-key": admin,
      })
    ).body
  );
  console.log("lab subtree products", sub.total);
}
