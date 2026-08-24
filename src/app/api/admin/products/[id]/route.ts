import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugifyAdmin } from "@/lib/admin-auth";
import {
  removeAdminProductRecord,
  upsertAdminProductRecord,
} from "@/lib/admin-products-store";
import { sanitizeText } from "@/lib/security";
import { normalizeImageUrl } from "@/lib/image-url";

function bustCatalogCache(slug?: string) {
  try {
    revalidateTag("catalog", "max");
    revalidatePath("/ru");
    revalidatePath("/en");
    revalidatePath("/ru/catalog");
    revalidatePath("/en/catalog");
    if (slug) {
      revalidatePath(`/ru/product/${slug}`);
      revalidatePath(`/en/product/${slug}`);
    }
  } catch {
    /* ignore */
  }
}

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  nameRu: z.string().min(2).max(250).optional(),
  nameEn: z.string().max(250).optional().nullable(),
  sku: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  shortRu: z.string().max(500).optional().nullable(),
  shortEn: z.string().max(500).optional().nullable(),
  descriptionRu: z.string().max(10000).optional().nullable(),
  descriptionEn: z.string().max(10000).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  manufacturerName: z.string().max(120).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable().or(z.literal("")),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
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
  const existing = await prisma.manufacturer.findFirst({ where: { name: n } });
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

export async function GET(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      manufacturer: true,
      images: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    let categorySlug = existing.category.slug;
    if (data.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
      categorySlug = cat.slug;
    }

    let manufacturerId: string | null | undefined = undefined;
    if (data.manufacturerName !== undefined) {
      manufacturerId = await upsertManufacturerByName(data.manufacturerName);
    }

    const imageUrl =
      data.imageUrl !== undefined
        ? data.imageUrl?.trim()
          ? normalizeImageUrl(data.imageUrl)
          : null
        : existing.images[0]?.url || null;

    if (data.specifications) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } });
    }
    if (data.imageUrl !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.nameRu !== undefined
          ? { nameRu: sanitizeText(data.nameRu, 250) }
          : {}),
        ...(data.nameEn !== undefined
          ? {
              nameEn: sanitizeText(
                data.nameEn?.trim() || data.nameRu || existing.nameRu,
                250
              ),
            }
          : {}),
        ...(data.sku !== undefined ? { sku: data.sku?.trim() || null } : {}),
        ...(data.model !== undefined
          ? { model: data.model?.trim() || null }
          : {}),
        ...(data.shortRu !== undefined
          ? {
              shortRu: data.shortRu
                ? sanitizeText(data.shortRu, 500)
                : null,
            }
          : {}),
        ...(data.shortEn !== undefined
          ? {
              shortEn: data.shortEn
                ? sanitizeText(data.shortEn, 500)
                : null,
            }
          : {}),
        ...(data.descriptionRu !== undefined
          ? {
              descriptionRu: data.descriptionRu
                ? sanitizeText(data.descriptionRu, 10000)
                : null,
            }
          : {}),
        ...(data.descriptionEn !== undefined
          ? {
              descriptionEn: data.descriptionEn
                ? sanitizeText(data.descriptionEn, 10000)
                : null,
            }
          : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(manufacturerId !== undefined ? { manufacturerId } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        source: "admin",
        ...(data.imageUrl !== undefined && imageUrl
          ? {
              images: {
                create: [
                  {
                    url: imageUrl,
                    altRu: data.nameRu || existing.nameRu,
                    altEn: data.nameEn || existing.nameEn,
                    sortOrder: 0,
                  },
                ],
              },
            }
          : {}),
        ...(data.specifications
          ? {
              specifications: {
                create: data.specifications.map((s, i) => ({
                  labelRu: sanitizeText(s.labelRu, 120),
                  labelEn: sanitizeText(s.labelEn || s.labelRu, 120),
                  valueRu: sanitizeText(s.valueRu, 500),
                  valueEn: sanitizeText(s.valueEn || s.valueRu, 500),
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      include: {
        category: { select: { slug: true, nameRu: true } },
        images: true,
        manufacturer: true,
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
      categorySlug,
      manufacturerName:
        data.manufacturerName !== undefined
          ? data.manufacturerName?.trim() || null
          : product.manufacturer?.name || null,
      imageUrl: product.images[0]?.url || imageUrl,
      specifications: data.specifications?.map((s) => ({
        labelRu: s.labelRu,
        labelEn: s.labelEn || s.labelRu,
        valueRu: s.valueRu,
        valueEn: s.valueEn || s.valueRu,
      })),
    });

    bustCatalogCache(product.slug);
    return NextResponse.json({ product });
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

export async function DELETE(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  removeAdminProductRecord(existing.slug);
  bustCatalogCache(existing.slug);

  return NextResponse.json({ ok: true });
}
