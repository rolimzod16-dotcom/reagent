import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { sanitizeText } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  titleRu: z.string().min(2).max(200).optional(),
  titleEn: z.string().max(200).optional().nullable(),
  bodyRu: z.string().max(4000).optional(),
  bodyEn: z.string().max(4000).optional().nullable(),
  catalogSlug: z.string().max(120).optional().nullable(),
  published: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    const data = schema.parse(await req.json());
    const solution = await prisma.solution.update({
      where: { id },
      data: {
        ...(data.titleRu !== undefined && {
          titleRu: sanitizeText(data.titleRu, 200),
        }),
        ...(data.titleEn !== undefined && {
          titleEn: sanitizeText(data.titleEn || "", 200),
        }),
        ...(data.bodyRu !== undefined && { bodyRu: data.bodyRu }),
        ...(data.bodyEn !== undefined && { bodyEn: data.bodyEn || "" }),
        ...(data.catalogSlug !== undefined && {
          catalogSlug: data.catalogSlug?.trim() || null,
        }),
        ...(data.published !== undefined && { published: data.published }),
      },
    });
    bustCms();
    return NextResponse.json({ solution });
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
  await prisma.solution.delete({ where: { id } });
  bustCms();
  return NextResponse.json({ ok: true });
}
