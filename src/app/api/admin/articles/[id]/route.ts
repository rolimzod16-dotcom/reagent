import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { sanitizeText } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  titleRu: z.string().min(2).max(250).optional(),
  titleEn: z.string().max(250).optional().nullable(),
  excerptRu: z.string().max(500).optional().nullable(),
  excerptEn: z.string().max(500).optional().nullable(),
  bodyRu: z.string().max(20000).optional(),
  bodyEn: z.string().max(20000).optional().nullable(),
  published: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    const data = schema.parse(await req.json());
    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(data.titleRu !== undefined && {
          titleRu: sanitizeText(data.titleRu, 250),
        }),
        ...(data.titleEn !== undefined && {
          titleEn: sanitizeText(data.titleEn || "", 250),
        }),
        ...(data.excerptRu !== undefined && {
          excerptRu: data.excerptRu ? sanitizeText(data.excerptRu, 500) : null,
        }),
        ...(data.excerptEn !== undefined && {
          excerptEn: data.excerptEn ? sanitizeText(data.excerptEn, 500) : null,
        }),
        ...(data.bodyRu !== undefined && { bodyRu: data.bodyRu }),
        ...(data.bodyEn !== undefined && { bodyEn: data.bodyEn || "" }),
        ...(data.published !== undefined && { published: data.published }),
      },
    });
    bustCms();
    return NextResponse.json({ article });
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
  await prisma.article.delete({ where: { id } });
  bustCms();
  return NextResponse.json({ ok: true });
}
