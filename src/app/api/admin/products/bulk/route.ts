import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  loadAdminProductRecords,
  saveAdminProductRecords,
} from "@/lib/admin-products-store";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "delete"]),
});

function bustCatalogCache(slugs: string[]) {
  try {
    revalidateTag("catalog", "max");
    revalidatePath("/ru");
    revalidatePath("/en");
    revalidatePath("/ru/catalog");
    revalidatePath("/en/catalog");
    for (const slug of slugs) {
      revalidateTag(`product:${slug}`, "max");
      revalidatePath(`/ru/product/${slug}`);
      revalidatePath(`/en/product/${slug}`);
    }
  } catch {
    /* ignore outside next runtime */
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { ids: rawIds, action } = schema.parse(await req.json());
    const ids = [...new Set(rawIds)];
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });
    if (!products.length) {
      return NextResponse.json({ error: "Товары не найдены" }, { status: 404 });
    }

    const foundIds = products.map((product) => product.id);
    const slugs = products.map((product) => product.slug);

    if (action === "delete") {
      await prisma.product.deleteMany({ where: { id: { in: foundIds } } });
    } else {
      const published = action === "publish";
      await prisma.product.updateMany({
        where: { id: { in: foundIds } },
        data: { published },
      });
    }

    const slugSet = new Set(slugs);
    const records = loadAdminProductRecords();
    if (action === "delete") {
      saveAdminProductRecords(
        records.filter((record) => !slugSet.has(record.slug))
      );
    } else {
      const published = action === "publish";
      saveAdminProductRecords(
        records.map((record) =>
          slugSet.has(record.slug) ? { ...record, published } : record
        )
      );
    }

    bustCatalogCache(slugs);
    return NextResponse.json({
      ok: true,
      action,
      affected: products.length,
      missing: ids.length - products.length,
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
