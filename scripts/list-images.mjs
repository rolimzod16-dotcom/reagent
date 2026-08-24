import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const products = await p.product.findMany({
  include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
  orderBy: { nameRu: "asc" },
});
const byUrl = {};
for (const x of products) {
  const url = x.images[0]?.url || "NONE";
  byUrl[url] = (byUrl[url] || 0) + 1;
  console.log(x.sku || "-", "|", x.category.slug, "|", url.slice(0, 90), "|", x.nameRu.slice(0, 50));
}
console.log("\n=== DUPLICATES ===");
Object.entries(byUrl)
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1])
  .forEach(([u, n]) => console.log(n, u.slice(0, 100)));
await p.$disconnect();
