import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeText } from "@/lib/security";
import {
  bustCatalogCache,
  categoryDepth,
  isDescendant,
  parseCategoryImage,
  serializeCategory,
} from "@/lib/catalog-admin";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  image: z.string().max(2000).nullable().optional(),
  nameRu: z.string().min(2).max(160).optional(),
  nameEn: z.string().max(160).optional().nullable(),
  parentId: z.string().min(1).nullable().optional(),
  published: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  try {
    const data = schema.parse(await req.json());
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, slug: true, parentId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    }

    const patch: {
      image?: string | null;
      nameRu?: string;
      nameEn?: string;
      parentId?: string | null;
      published?: boolean;
    } = {};

    if (data.image !== undefined) {
      const parsed = parseCategoryImage(data.image);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: "Нужна прямая ссылка на фото (https://…) или сброс" },
          { status: 400 }
        );
      }
      patch.image = parsed.value;
    }
    if (data.nameRu !== undefined) patch.nameRu = sanitizeText(data.nameRu, 160);
    if (data.nameEn !== undefined) {
      patch.nameEn = data.nameEn?.trim()
        ? sanitizeText(data.nameEn, 160)
        : patch.nameRu || existing.slug;
    }
    if (data.published !== undefined) patch.published = data.published;

    if (data.parentId !== undefined) {
      const parentId = data.parentId;
      if (parentId === id) {
        return NextResponse.json(
          { error: "Нельзя сделать категорию родителем самой себя" },
          { status: 400 }
        );
      }
      if (parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: parentId },
          select: { id: true },
        });
        if (!parent) {
          return NextResponse.json(
            { error: "Родительская категория не найдена" },
            { status: 400 }
          );
        }
        if (await isDescendant(id, parentId)) {
          return NextResponse.json(
            { error: "Нельзя перенести в свою же подкатегорию" },
            { status: 400 }
          );
        }
        const depth = await categoryDepth(parentId);
        if (depth >= 4) {
          return NextResponse.json(
            { error: "Слишком глубоко — максимум 4 уровня" },
            { status: 400 }
          );
        }
      }
      patch.parentId = parentId;
    }

    const category = await prisma.category.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameEn: true,
        image: true,
        parentId: true,
        published: true,
      },
    });

    bustCatalogCache();

    return NextResponse.json({ category: serializeCategory(category) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  const ids = [id];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const kids = await prisma.category.findMany({
      where: { parentId: cur },
      select: { id: true },
    });
    for (const k of kids) {
      ids.push(k.id);
      queue.push(k.id);
    }
  }

  const used = await prisma.product.count({
    where: { categoryId: { in: ids } },
  });
  if (used > 0) {
    await prisma.category.update({
      where: { id },
      data: { published: false },
    });
    bustCatalogCache();
    return NextResponse.json({
      ok: true,
      unpublished: true,
      message: "В разделе есть товары — скрыли, не удалили",
    });
  }

  await prisma.category.deleteMany({ where: { id: { in: ids } } });
  bustCatalogCache();
  return NextResponse.json({ ok: true, deleted: true });
}
