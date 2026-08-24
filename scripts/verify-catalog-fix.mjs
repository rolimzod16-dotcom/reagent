import https from "https";

const BASE = "https://www.reagent.tj";

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      BASE + path,
      { headers: { "User-Agent": "verify" }, timeout: 40000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

const home = await get("/ru");
const cat = await get("/ru/catalog");
const reags = await get("/ru/catalog/reaktivy_laboratornykh_issledovaniy");
const lab = await get("/ru/catalog/laboratoriya");

function check(name, html, needles) {
  console.log("\n==", name, html.status, html.body.length);
  for (const s of needles) {
    console.log((html.body.includes(s) ? "OK  " : "MISS") + " " + s);
  }
}

check("home", home, ["Реагенты", "Лабораторное оборудование", "позиций"]);
check("catalog", cat, [
  "Реагенты",
  "Лабораторное оборудование",
  "Товары",
  "Бумага для диагностического",
]);
check("reagents page", reags, ["Реагенты", "ПЦР", "Иммунохимия", "Товары"]);
check("lab page", lab, ["Лабораторное оборудование", "Товары"]);
