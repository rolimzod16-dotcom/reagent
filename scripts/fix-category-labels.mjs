/**
 * Align confusing category names + flatten dummy "Other" leaf.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
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
  connectionTimeoutMillis: 12000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const RENAMES = [
  {
    slug: "vb-immunochemistry-ifa-nabory",
    nameRu: "ИФА-наборы",
    nameEn: "ELISA kits",
  },
  {
    slug: "vb-immunochemistry-immunokhemilyuminestsentnyy-analiz-nabory",
    nameRu: "ИХЛА-наборы",
    nameEn: "CLIA kits",
  },
  {
    slug: "vb-immunochemistry-ekspress-diagnostika-nabory",
    nameRu: "Экспресс-наборы",
    nameEn: "Rapid tests",
  },
  {
    slug: "vb-ptsr-zbm",
    nameRu: "Прочие ПЦР-наборы",
    nameEn: "Other PCR kits",
  },
  {
    slug: "threelab-equipment",
    nameRu: "Лабораторные приборы",
    nameEn: "Laboratory instruments",
  },
];

try {
  for (const row of RENAMES) {
    const r = await prisma.category.updateMany({
      where: { slug: row.slug },
      data: { nameRu: row.nameRu, nameEn: row.nameEn },
    });
    console.log("rename", row.slug, r.count, "→", row.nameRu);
  }

  const other = await prisma.category.findUnique({
    where: { slug: "tl-other" },
  });
  const parent = await prisma.category.findUnique({
    where: { slug: "threelab-equipment" },
  });
  if (other && parent && other.id !== parent.id) {
    const moved = await prisma.product.updateMany({
      where: { categoryId: other.id },
      data: { categoryId: parent.id },
    });
    await prisma.category.update({
      where: { id: other.id },
      data: { published: false },
    });
    console.log("flatten tl-other → threelab-equipment", moved.count);
  } else {
    console.log("flatten skipped", {
      other: !!other,
      parent: !!parent,
    });
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
