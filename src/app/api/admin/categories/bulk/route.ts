import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCatalogCache } from "@/lib/catalog-admin";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "delete"]),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { ids: rawIds, action } = schema.parse(await req.json());
    const ids = [...new Set(rawIds)];
    const categories = await prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const existingIds = new Set(categories.map((category) => category.id));
    const selected = new Set(ids.filter((id) => existingIds.has(id)));
    if (!selected.size) {
      return NextResponse.json(
        { error: "Категории не найдены" },
        { status: 404 }
      );
    }

    if (action !== "delete") {
      const published = action === "publish";
      const result = await prisma.category.updateMany({
        where: { id: { in: [...selected] } },
        data: { published },
      });
      bustCatalogCache();
      return NextResponse.json({
        ok: true,
        action,
        affected: result.count,
        hidden: 0,
        deleted: 0,
      });
    }

    const parentById = new Map(
      categories.map((category) => [category.id, category.parentId] as const)
    );
    const childrenByParent = new Map<string, string[]>();
    for (const category of categories) {
      if (!category.parentId) continue;
      const children = childrenByParent.get(category.parentId) || [];
      children.push(category.id);
      childrenByParent.set(category.parentId, children);
    }

    // If a parent and its child are both checked, process the parent once.
    const roots = [...selected].filter((id) => {
      let parentId = parentById.get(id) || null;
      while (parentId) {
        if (selected.has(parentId)) return false;
        parentId = parentById.get(parentId) || null;
      }
      return true;
    });

    function branchIds(rootId: string) {
      const branch = [rootId];
      for (let index = 0; index < branch.length; index += 1) {
        branch.push(...(childrenByParent.get(branch[index]) || []));
      }
      return branch;
    }

    const branches = roots.map((rootId) => ({
      rootId,
      ids: branchIds(rootId),
    }));
    const allBranchIds = [...new Set(branches.flatMap((branch) => branch.ids))];
    const productGroups = await prisma.product.groupBy({
      by: ["categoryId"],
      where: { categoryId: { in: allBranchIds } },
      _count: { _all: true },
    });
    const usedCategoryIds = new Set(productGroups.map((group) => group.categoryId));

    const rootsToHide: string[] = [];
    const idsToDelete: string[] = [];
    for (const branch of branches) {
      if (branch.ids.some((id) => usedCategoryIds.has(id))) {
        rootsToHide.push(branch.rootId);
      } else {
        idsToDelete.push(...branch.ids);
      }
    }

    await prisma.$transaction([
      prisma.category.updateMany({
        where: { id: { in: rootsToHide } },
        data: { published: false },
      }),
      prisma.category.deleteMany({
        where: { id: { in: [...new Set(idsToDelete)] } },
      }),
    ]);

    bustCatalogCache();
    return NextResponse.json({
      ok: true,
      action,
      affected: roots.length,
      hidden: rootsToHide.length,
      deleted: new Set(idsToDelete).size,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Некорректный запрос" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
