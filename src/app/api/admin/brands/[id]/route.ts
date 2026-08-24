import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { sanitizeText } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  descriptionRu: z.string().max(2000).optional().nullable(),
  descriptionEn: z.string().max(2000).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  published: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    const data = schema.parse(await req.json());
    const brand = await prisma.manufacturer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: sanitizeText(data.name, 120) }),
        ...(data.descriptionRu !== undefined && {
          descriptionRu: data.descriptionRu
            ? sanitizeText(data.descriptionRu, 2000)
            : null,
        }),
        ...(data.descriptionEn !== undefined && {
          descriptionEn: data.descriptionEn
            ? sanitizeText(data.descriptionEn, 2000)
            : null,
        }),
        ...(data.website !== undefined && {
          website: data.website?.trim() || null,
        }),
        ...(data.published !== undefined && { published: data.published }),
      },
    });
    bustCms();
    return NextResponse.json({ brand });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const used = await prisma.product.count({ where: { manufacturerId: id } });
  if (used > 0) {
    await prisma.manufacturer.update({
      where: { id },
      data: { published: false },
    });
    bustCms();
    return NextResponse.json({
      ok: true,
      unpublished: true,
      message: "Есть товары — бренд скрыт, не удалён",
    });
  }
  await prisma.manufacturer.delete({ where: { id } });
  bustCms();
  return NextResponse.json({ ok: true });
}
