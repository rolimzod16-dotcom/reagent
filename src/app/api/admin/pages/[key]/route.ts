import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { ensureCmsDefaults } from "@/lib/cms";
import { sanitizeText } from "@/lib/security";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { key } = await ctx.params;
  await ensureCmsDefaults();
  const page = await prisma.cmsPage.findUnique({ where: { key } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

const schema = z.object({
  titleRu: z.string().min(2).max(200),
  titleEn: z.string().max(200).optional(),
  bodyRu: z.string().min(2).max(20000),
  bodyEn: z.string().max(20000).optional(),
});

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const { key } = await ctx.params;
  try {
    const data = schema.parse(await req.json());
    const page = await prisma.cmsPage.upsert({
      where: { key },
      create: {
        key,
        titleRu: sanitizeText(data.titleRu, 200),
        titleEn: sanitizeText(data.titleEn || data.titleRu, 200),
        bodyRu: data.bodyRu,
        bodyEn: data.bodyEn || data.bodyRu,
      },
      update: {
        titleRu: sanitizeText(data.titleRu, 200),
        titleEn: sanitizeText(data.titleEn || data.titleRu, 200),
        bodyRu: data.bodyRu,
        bodyEn: data.bodyEn || data.bodyRu,
      },
    });
    bustCms();
    return NextResponse.json({ page });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
