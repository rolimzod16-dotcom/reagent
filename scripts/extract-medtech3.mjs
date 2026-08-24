import fs from "fs";
const s = fs.readFileSync("medtech-main.js", "utf8");

// find axios/fetch base
const idx = s.indexOf("/api/products");
console.log("context products:", s.slice(Math.max(0, idx - 200), idx + 200));

const idx2 = s.indexOf("baseURL");
console.log("baseURL contexts:");
let i = 0;
let pos = 0;
while (i < 5 && (pos = s.indexOf("baseURL", pos)) !== -1) {
  console.log(s.slice(pos, pos + 150));
  pos += 7;
  i++;
}

const idx3 = s.indexOf("VITE_");
console.log("VITE", s.slice(idx3, idx3 + 200));

const re = /https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/g;
const hosts = [...s.matchAll(re)].map((m) => m[0]);
console.log("hosts", [...new Set(hosts)].slice(0, 40).join("\n"));
