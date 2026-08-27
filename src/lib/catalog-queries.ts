import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCategoryTree, getCategoryWithAncestry } from "@/lib/catalog";
import { isJunkText } from "@/lib/content-filter";

const getCachedManufacturers = unstable_cache(
  async () =>
    prisma.manufacturer.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    }),
  ["manufacturers-list-v2"],
  { revalidate: 300, tags: ["catalog"] }
);

async function fetchCatalogProducts(opts: {
  manufacturer?: string;
  q?: string;
  sort?: string;
  locale: string;
  page: number;
  perPage: number;
  categoryIds?: string[];
}) {
  const categoryFilter =
    opts.categoryIds && opts.categoryIds.length > 0
      ? { categoryId: { in: opts.categoryIds } }
      : {};

  const where = {
    published: true,
    ...categoryFilter,
    ...(opts.manufacturer
      ? { manufacturer: { slug: opts.manufacturer } }
      : {}),
    ...(opts.q
      ? {
          OR: [
            { nameRu: { contains: opts.q, mode: "insensitive" as const } },
            { nameEn: { contains: opts.q, mode: "insensitive" as const } },
            { sku: { contains: opts.q, mode: "insensitive" as const } },
            { model: { contains: opts.q, mode: "insensitive" as const } },
            {
              manufacturer: {
                name: { contains: opts.q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const orderBy =
    opts.sort === "new"
      ? ({ createdAt: "desc" } as const)
      : opts.locale === "ru"
        ? ({ nameRu: "asc" } as const)
        : ({ nameEn: "asc" } as const);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (opts.page - 1) * opts.perPage,
      take: opts.perPage,
      include: {
        manufacturer: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
  ]);

  return { total, products };
}

/** Cached catalog listing — keyed by filters so evening traffic hits cache. */
export function getCatalogPagePayload(opts: {
  manufacturer?: string;
  q?: string;
  sort?: string;
  locale: string;
  page: number;
  perPage?: number;
  skipProducts?: boolean;
}) {
  const perPage = opts.perPage ?? 12;
  const key = [
    "catalog-page-v15",
    opts.locale,
    opts.manufacturer || "",
    opts.q || "",
    opts.sort || "",
    String(opts.page),
    String(perPage),
    opts.skipProducts ? "dir" : "list",
  ];

  return unstable_cache(
    async () => {
      const [tree, manufacturers, listing] = await Promise.all([
        getCategoryTree(),
        getCachedManufacturers(),
        opts.skipProducts
          ? Promise.resolve({ total: 0, products: [] as Awaited<ReturnType<typeof fetchCatalogProducts>>["products"] })
          : fetchCatalogProducts({ ...opts, perPage }),
      ]);
      const total =
        opts.skipProducts
          ? tree.reduce((n, c) => n + c.count, 0)
          : listing.total;
      return { tree, manufacturers, products: listing.products, total, perPage };
    },
    key,
    { revalidate: 180, tags: ["catalog"] }
  )();
}

/** Cached category listing (same pattern as root catalog). */
export function getCategoryPagePayload(opts: {
  slug: string;
  manufacturer?: string;
  sort?: string;
  locale: string;
  page: number;
  perPage?: number;
}) {
  const perPage = opts.perPage ?? 24;
  const key = [
    "category-page-v11",
    opts.slug,
    opts.locale,
    opts.manufacturer || "",
    opts.sort || "",
    String(opts.page),
    String(perPage),
  ];

  return unstable_cache(
    async () => {
      const data = await getCategoryWithAncestry(opts.slug);
      if (!data) return null;

      const categoryIds = [data.category.id, ...data.childIds];
      const [tree, manufacturers, listing] = await Promise.all([
        getCategoryTree(),
        getCachedManufacturers(),
        fetchCatalogProducts({
          ...opts,
          perPage,
          categoryIds,
        }),
      ]);

      return {
        ...data,
        tree,
        manufacturers,
        ...listing,
        perPage,
      };
    },
    key,
    { revalidate: 180, tags: ["catalog"] }
  )();
}

/** One cached bundle for homepage — avoids N+1 pillar counts at peak. */
export function getHomePagePayload() {
  return unstable_cache(
    async () => {
      const [featured, manufacturers, productCount, tree] = await Promise.all(
        [
          prisma.product.findMany({
            where: { published: true, featured: true },
            take: 16,
            include: {
              manufacturer: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              category: true,
            },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.manufacturer.findMany({
            where: { published: true },
            take: 16,
            include: { _count: { select: { products: true } } },
            orderBy: { products: { _count: "desc" } },
          }),
          prisma.product.count({ where: { published: true } }),
          getCategoryTree(),
        ]
      );

      const pillarStats = tree
        .filter((p) => p.count > 0)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          nameRu: p.nameRu,
          nameEn: p.nameEn,
          image: p.image,
          descriptionRu: null as string | null,
          descriptionEn: null as string | null,
          totalProducts: p.count,
          children: p.children,
        }));

      const featuredClean = featured
        .filter(
          (p) =>
            !isJunkText(p.slug) &&
            !isJunkText(p.nameRu) &&
            !isJunkText(p.manufacturer?.name)
        )
        .slice(0, 8);
      const manufacturersClean = manufacturers
        .filter((m) => !isJunkText(m.slug) && !isJunkText(m.name))
        .slice(0, 8);

      return {
        pillarStats,
        featured: featuredClean,
        manufacturers: manufacturersClean,
        productCount,
        subcats: pillarStats,
      };
    },
    ["home-page-v13"],
    { revalidate: 180, tags: ["catalog"] }
  )();
}

/** Cached product detail + related — shared by page and metadata. */
export function getProductPagePayload(slug: string) {
  return unstable_cache(
    async () => {
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          manufacturer: true,
          images: { orderBy: { sortOrder: "asc" } },
          documents: { orderBy: { sortOrder: "asc" } },
          specifications: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!product || !product.published) return null;

      const related = await prisma.product.findMany({
        where: {
          published: true,
          categoryId: product.categoryId,
          id: { not: product.id },
        },
        take: 4,
        include: {
          manufacturer: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      });

      return { product, related };
    },
    ["product-page-v2", slug],
    { revalidate: 300, tags: ["catalog"] }
  )();
}

/** Cached brand page with pagination (never load hundreds of products). */
export function getBrandPagePayload(opts: {
  slug: string;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(1, opts.page || 1);
  const perPage = opts.perPage ?? 24;
  return unstable_cache(
    async () => {
      const brand = await prisma.manufacturer.findUnique({
        where: { slug: opts.slug },
        select: {
          id: true,
          slug: true,
          name: true,
          descriptionRu: true,
          descriptionEn: true,
          published: true,
        },
      });
      if (!brand || !brand.published) return null;

      const where = { published: true, manufacturerId: brand.id };
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { nameRu: "asc" },
          skip: (page - 1) * perPage,
          take: perPage,
          include: {
            manufacturer: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            category: true,
          },
        }),
      ]);

      return { brand, products, total, page, perPage };
    },
    ["brand-page-v1", opts.slug, String(page), String(perPage)],
    { revalidate: 300, tags: ["catalog"] }
  )();
}
