/**
 * Upsert EHBT-50 Mini Lab into live Supabase (and keep featured).
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// load .env manually
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const product = JSON.parse(
  fs.readFileSync(path.join(root, "data", "admin-products.json"), "utf8")
)[0];

async function main() {
  let cat = await prisma.category.findUnique({
    where: { slug: product.categorySlug },
  });
  if (!cat) {
    cat = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: { contains: "laborator" } },
          { nameRu: { contains: "Лаборатор" } },
        ],
      },
    });
  }
  if (!cat) throw new Error("No laboratory category found");

  let mfr = await prisma.manufacturer.findFirst({
    where: { name: product.manufacturerName },
  });
  if (!mfr) {
    mfr = await prisma.manufacturer.create({
      data: {
        slug: `ozelle-${Math.random().toString(36).slice(2, 5)}`,
        name: product.manufacturerName,
        published: true,
      },
    });
  }

  // unfeature others so EHBT-50 is hero #1
  await prisma.product.updateMany({
    where: { featured: true },
    data: { featured: false },
  });

  const existing = await prisma.product.findUnique({
    where: { slug: product.slug },
  });

  const data = {
    sku: product.sku,
    model: product.model,
    nameRu: product.nameRu,
    nameEn: product.nameEn,
    shortRu: product.shortRu,
    shortEn: product.shortEn,
    descriptionRu: product.descriptionRu,
    descriptionEn: product.descriptionEn,
    published: true,
    featured: true,
    source: "admin",
    categoryId: cat.id,
    manufacturerId: mfr.id,
  };

  let id;
  if (existing) {
    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    await prisma.productSpecification.deleteMany({
      where: { productId: existing.id },
    });
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data,
    });
    id = updated.id;
  } else {
    const created = await prisma.product.create({ data: { slug: product.slug, ...data } });
    id = created.id;
  }

  await prisma.productImage.create({
    data: {
      productId: id,
      url: product.imageUrl,
      altRu: product.nameRu,
      altEn: product.nameEn,
      sortOrder: 0,
    },
  });

  if (product.specifications?.length) {
    await prisma.productSpecification.createMany({
      data: product.specifications.map((s, i) => ({
        productId: id,
        labelRu: s.labelRu,
        labelEn: s.labelEn,
        valueRu: s.valueRu,
        valueEn: s.valueEn,
        sortOrder: i,
      })),
    });
  }

  console.log("OK", product.slug, "category=", cat.slug, "id=", id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
