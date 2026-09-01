import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace(
  /[?&]sslmode=[^&]+/g,
  ""
);
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 20000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const dir = path.join("public", "catalog", "cats");
const files = fs
  .readdirSync(dir)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const bySlug = {};
for (const f of files) {
  bySlug[f.replace(/\.(jpe?g|png|webp)$/i, "")] = `/catalog/cats/${f}`;
}
fs.writeFileSync(
  path.join("src", "lib", "catalog-unique.json"),
  JSON.stringify(bySlug, null, 2) + "\n"
);

let updated = 0;
let missing = 0;
for (const [slug, image] of Object.entries(bySlug)) {
  const res = await prisma.category.updateMany({
    where: { slug },
    data: { image },
  });
  if (res.count) updated += res.count;
  else missing++;
}
console.log({ files: files.length, updated, missingNoRow: missing });

await prisma.$disconnect();
await pool.end();
