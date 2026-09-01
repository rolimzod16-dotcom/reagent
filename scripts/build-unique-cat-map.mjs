import fs from "fs";
import path from "path";

const dir = path.join("public", "catalog", "cats");
const files = fs
  .readdirSync(dir)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const map = {};
for (const f of files) {
  const slug = f.replace(/\.(jpe?g|png|webp)$/i, "");
  map[slug] = `/catalog/cats/${f}`;
}
const out = path.join("src", "lib", "catalog-unique.json");
fs.writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
console.log("unique", Object.keys(map).length, "->", out);
