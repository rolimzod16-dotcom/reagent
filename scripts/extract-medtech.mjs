import fs from "fs";

const s = fs.readFileSync("medtech-main.js", "utf8");
const urls = [
  ...s.matchAll(/https?:\/\/[^"'\\\s)]+\.(?:jpg|jpeg|png|webp)/gi),
].map((m) => m[0]);
const unique = [...new Set(urls)];
console.log("=== IMAGES ===");
console.log(unique.slice(0, 60).join("\n"));
console.log("count", unique.length);

// relative image paths
const rel = [
  ...s.matchAll(/["'](\/[^"'\\]+\.(?:jpg|jpeg|png|webp|svg))["']/gi),
].map((m) => m[1]);
console.log("=== REL IMAGES ===");
console.log([...new Set(rel)].slice(0, 80).join("\n"));

// route-like strings
const routes = [...s.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]);
console.log("=== PATHS ===");
console.log([...new Set(routes)].join("\n"));
