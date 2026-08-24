import fs from "fs";
const s = fs.readFileSync("medtech-main.js", "utf8");

const apis = [...s.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map((m) => m[1]);
console.log("=== API ===");
console.log([...new Set(apis)].join("\n"));

const firebase = [...s.matchAll(/https?:\/\/[a-z0-9.-]+\.(firebase|supabase|amazonaws|cloudinary|digitaloceanspaces)[^"'\\\s]*/gi)].map(m=>m[0]);
console.log("=== CLOUD ===");
console.log([...new Set(firebase)].slice(0,30).join("\n"));

const uploads = [...s.matchAll(/uploads\/[a-zA-Z0-9_./-]+/g)].map(m=>m[0]);
console.log("=== UPLOADS ===");
console.log([...new Set(uploads)].slice(0,50).join("\n"));

// try to find product names
const names = [...s.matchAll(/"name"\s*:\s*"([^"]{5,80})"/g)].map(m=>m[1]);
console.log("=== NAMES sample ===");
console.log([...new Set(names)].slice(0,40).join("\n"));
