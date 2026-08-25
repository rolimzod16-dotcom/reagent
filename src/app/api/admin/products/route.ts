import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugifyAdmin } from "@/lib/admin-auth";
import { getDescendantCategoryIds } from "@/lib/catalog";
import {
  upsertAdminProductRecord,
  loadAdminProductRecords,
} from "@/lib/admin-products-store";
import { sanitizeText } from "@/lib/security";
import { productSearchWhere } from "@/lib/search";
import { isHttpUrl, normalizeImageUrl } from "@/lib/image-url";
import { parsePriceAmount, PRICE_CURRENCIES } from "@/lib/price";
import type { Prisma } from "@prisma/client";

function bustCatalogCache() {
  try {
    revalidateTag("catalog", "max");
    revalidatePath("/ru");
    revalidatePath("/en");
    revalidatePath("/ru/catalog");
    revalidatePath("/en/catalog");
  } catch {
    /* ignore outside next runtime */
  }
}

const productSchema = z.object({
  nameRu: z.string().min(2).max(250),
  nameEn: z.string().max(250).optional().nullable(),
  sku: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  shortRu: z.string().max(500).optional().nullable(),
  shortEn: z.string().max(500).optional().nullable(),
  descriptionRu: z.string().max(10000).optional().nullable(),
  descriptionEn: z.string().max(10000).optional().nullable(),
  categoryId: z.string().min(1),
  manufacturerName: z.string().max(120).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable().or(z.literal("")),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  priceOnRequest: z.boolean().optional(),
  priceAmount: z.string().max(20).optional().nullable(),
  priceCurrency: z.string().max(8).optional().nullable(),
  specifications: z
    .array(
      z.object({
        labelRu: z.string().min(1).max(120),
        labelEn: z.string().max(120).optional().nullable(),
        valueRu: z.string().min(1).max(500),
        valueEn: z.string().max(500).optional().nullable(),
      })
    )
    .max(30)
    .optional(),
});

async function upsertManufacturerByName(name: string | null | undefined) {
  if (!name?.trim()) return null;
  const n = sanitizeText(name, 120);
  const existing = await prisma.manufacturer.findFirst({
    where: { name: n },
  });
  if (existing) return existing.id;
  const base = slugifyAdmin(n) || "brand";
  const m = await prisma.manufacturer.create({
    data: {
      slug: `${base}-${Math.random().toString(36).slice(2, 6)}`,
      name: n,
      published: true,
    },
  });
  return m.id;
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const categoryId = url.searchParams.get("categoryId") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const perPage = Math.min(100, Math.max(10, Number(url.searchParams.get("perPage") || 50)));

  let categoryFilter: Prisma.ProductWhereInput = {};
  if (categoryId) {
    const descendantIds = await getDescendantCategoryIds(categoryId);
    categoryFilter = {
      categoryId: { in: [categoryId, ...descendantIds] },
    };
  }

  const where: Prisma.ProductWhereInput = {
    ...categoryFilter,
    ...productSearchWhere(q),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        category: { select: { id: true, slug: true, nameRu: true, parentId: true } },
        manufacturer: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { specifications: true } },
      },
    }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    adminStored: loadAdminProductRecords().length,
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const manufacturerId = await upsertManufacturerByName(
      data.manufacturerName
    );

    let slug = slugifyAdmin(data.nameRu) || `product-${Date.now()}`;
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

    const nameEn = data.nameEn?.trim() || data.nameRu;
    const amount = parsePriceAmount(data.priceAmount ?? null);
    if (data.priceOnRequest === false && !amount) {
      return NextResponse.json(
        { error: "Укажите цену или включите «цена по запросу»" },
        { status: 400 }
      );
    }
    const imageUrl = data.imageUrl?.trim()
      ? normalizeImageUrl(data.imageUrl)
      : null;
    if (imageUrl && !isHttpUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Ссылка на фото должна начинаться с https://" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        slug,
        sku: data.sku?.trim() || null,
        model: data.model?.trim() || data.sku?.trim() || null,
        nameRu: sanitizeText(data.nameRu, 250),
        nameEn: sanitizeText(nameEn, 250),
        shortRu: data.shortRu ? sanitizeText(data.shortRu, 500) : null,
        shortEn: data.shortEn ? sanitizeText(data.shortEn, 500) : null,
        descriptionRu: data.descriptionRu
          ? sanitizeText(data.descriptionRu, 10000)
          : null,
        descriptionEn: data.descriptionEn
          ? sanitizeText(data.descriptionEn, 10000)
          : null,
        published: data.published !== false,
        featured: !!data.featured,
        priceOnRequest: data.priceOnRequest !== false,
        priceAmount: amount,
        priceCurrency: PRICE_CURRENCIES.includes(
          (data.priceCurrency || "USD") as (typeof PRICE_CURRENCIES)[number]
        )
          ? (data.priceCurrency || "USD")
          : "USD",
        source: "admin",
        categoryId: cat.id,
        manufacturerId,
        images: imageUrl
          ? {
              create: [
                {
                  url: imageUrl,
                  altRu: data.nameRu,
                  altEn: nameEn,
                  sortOrder: 0,
                },
              ],
            }
          : undefined,
        specifications: data.specifications?.length
          ? {
              create: data.specifications.map((s, i) => ({
                labelRu: sanitizeText(s.labelRu, 120),
                labelEn: sanitizeText(s.labelEn || s.labelRu, 120),
                valueRu: sanitizeText(s.valueRu, 500),
                valueEn: sanitizeText(s.valueEn || s.valueRu, 500),
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        category: { select: { slug: true, nameRu: true } },
        images: true,
      },
    });

    upsertAdminProductRecord({
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      model: product.model,
      nameRu: product.nameRu,
      nameEn: product.nameEn,
      shortRu: product.shortRu,
      shortEn: product.shortEn,
      descriptionRu: product.descriptionRu,
      descriptionEn: product.descriptionEn,
      published: product.published,
      featured: product.featured,
      categorySlug: cat.slug,
      manufacturerName: data.manufacturerName?.trim() || null,
      imageUrl,
      specifications: data.specifications?.map((s) => ({
        labelRu: s.labelRu,
        labelEn: s.labelEn || s.labelRu,
        valueRu: s.valueRu,
        valueEn: s.valueEn || s.valueRu,
      })),
    });

    bustCatalogCache();
    revalidatePath(`/ru/product/${product.slug}`);
    revalidatePath(`/en/product/${product.slug}`);

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
