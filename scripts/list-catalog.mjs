import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const cats = await p.category.findMany({
  include: { _count: { select: { products: true } } },
  orderBy: { sortOrder: "asc" },
});
const prods = await p.product.findMany({
  include: { category: true, manufacturer: true },
});
console.log("=== OUR CATEGORIES ===");
cats.forEach((c) =>
  console.log(c._count.products, c.slug, "|", c.nameRu)
);
console.log("=== OUR PRODUCTS ===");
prods.forEach((x) =>
  console.log(
    "-",
    x.category.slug,
    "|",
    x.nameRu.slice(0, 75),
    "|",
    x.manufacturer?.name || "-"
  )
);
await p.$disconnect();
