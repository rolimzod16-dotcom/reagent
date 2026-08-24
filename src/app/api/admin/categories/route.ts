import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogImage, defaultCatalogImage } from "@/lib/catalog-images";
import {
  bustCatalogCache,
  categoryDepth,
  nextSortOrder,
  parseCategoryImage,
  serializeCategory,
  uniqueCategorySlug,
} from "@/lib/catalog-admin";
import { sanitizeText } from "@/lib/security";

type TreeNode = {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  image: string | null;
  parentId: string | null;
  published: boolean;
  displayImage: string;
  defaultImage: string;
  productCount: number;
  subtreeCount: number;
  children: TreeNode[];
};

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const [rows, grouped] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }],
      select: {
        id: true,
        slug: true,
        nameRu: true,
        nameEn: true,
        image: true,
        parentId: true,
        published: true,
        sortOrder: true,
      },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { published: true },
      _count: { _all: true },
    }),
  ]);

  const direct: Record<string, number> = {};
  for (const g of grouped) direct[g.categoryId] = g._count._all;

  const byParent: Record<string, typeof rows> = {};
  for (const r of rows) {
    const key = r.parentId ?? "__root__";
    (byParent[key] ||= []).push(r);
  }

  function descendants(id: string): string[] {
    const out: string[] = [];
    const q = [...(byParent[id] || []).map((c) => c.id)];
    while (q.length) {
      const cur = q.shift()!;
      out.push(cur);
      for (const ch of byParent[cur] || []) q.push(ch.id);
    }
    return out;
  }

  function subtreeCount(id: string): number {
    let n = direct[id] || 0;
    for (const d of descendants(id)) n += direct[d] || 0;
    return n;
  }

  function mapNode(r: (typeof rows)[number]): TreeNode {
    const children = (byParent[r.id] || []).map(mapNode);
    return {
      id: r.id,
      slug: r.slug,
      nameRu: r.nameRu,
      nameEn: r.nameEn,
      image: r.image,
      parentId: r.parentId,
      published: r.published,
      displayImage: catalogImage(r.slug, r.image),
      defaultImage: defaultCatalogImage(r.slug),
      productCount: direct[r.id] || 0,
      subtreeCount: subtreeCount(r.id),
      children,
    };
  }

  const tree = (byParent.__root__ || []).map(mapNode);
  const total = rows.length;

  const flat: {
    id: string;
    slug: string;
    nameRu: string;
    label: string;
    depth: number;
    parentId: string | null;
  }[] = [];
  function walk(nodes: TreeNode[], depth: number) {
    for (const n of nodes) {
      const pad = depth === 0 ? "" : `${"— ".repeat(depth)}`;
      flat.push({
        id: n.id,
        slug: n.slug,
        nameRu: n.nameRu,
        label: `${pad}${n.nameRu}${n.subtreeCount ? ` (${n.subtreeCount})` : ""}`,
        depth,
        parentId: n.parentId,
      });
      walk(n.children, depth + 1);
    }
  }
  walk(tree, 0);

  return NextResponse.json({ tree, flat, total });
}

const createSchema = z.object({
  nameRu: z.string().min(2).max(160),
  nameEn: z.string().max(160).optional().nullable(),
  parentId: z.string().min(1).optional().nullable(),
  image: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const data = createSchema.parse(await req.json());
    const nameRu = sanitizeText(data.nameRu, 160);
    const nameEn = data.nameEn?.trim()
      ? sanitizeText(data.nameEn, 160)
      : nameRu;

    let parentId: string | null = data.parentId || null;
    let parentImage: string | null = null;
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true, image: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Родительская категория не найдена" },
          { status: 400 }
        );
      }
      parentImage = parent.image;
      const depth = await categoryDepth(parentId);
      if (depth >= 4) {
        return NextResponse.json(
          { error: "Слишком глубоко — максимум 4 уровня" },
          { status: 400 }
        );
      }
    }

    const parsed = parseCategoryImage(data.image ?? null);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Нужна прямая ссылка на фото (https://…)" },
        { status: 400 }
      );
    }

    const slug = await uniqueCategorySlug(nameRu);
    const sortOrder = await nextSortOrder(parentId);

    const category = await prisma.category.create({
      data: {
        slug,
        nameRu,
        nameEn,
        parentId,
        image: parsed.value || parentImage,
        published: true,
        sortOrder,
      },
    });

    bustCatalogCache();
    return NextResponse.json(
      { category: serializeCategory(category) },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
