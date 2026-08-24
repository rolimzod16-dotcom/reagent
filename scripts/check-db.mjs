import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const cats = await p.category.findMany({
  select: {
    slug: true,
    nameRu: true,
    parentId: true,
    _count: { select: { products: true } },
  },
  orderBy: { sortOrder: "asc" },
});
console.log(
  cats.map((c) => ({
    slug: c.slug,
    n: c.nameRu,
    hasParent: !!c.parentId,
    pc: c._count.products,
  }))
);
const prods = await p.product.count();
const withImg = await p.product.count({ where: { images: { some: {} } } });
console.log({ prods, withImg });
const sample = await p.product.findMany({
  take: 8,
  include: { images: true, category: true },
  orderBy: { createdAt: "desc" },
});
console.log(
  sample.map((s) => ({
    slug: s.slug,
    sku: s.sku,
    cat: s.category.slug,
    img: s.images[0]?.url?.slice(0, 80),
  }))
);
await p.$disconnect();
