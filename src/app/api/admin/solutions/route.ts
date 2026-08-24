import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugifyAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { ensureCmsDefaults } from "@/lib/cms";
import { sanitizeText } from "@/lib/security";

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  await ensureCmsDefaults();
  const solutions = await prisma.solution.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ solutions });
}

const schema = z.object({
  titleRu: z.string().min(2).max(200),
  titleEn: z.string().max(200).optional(),
  bodyRu: z.string().max(4000).optional(),
  bodyEn: z.string().max(4000).optional(),
  catalogSlug: z.string().max(120).optional().nullable(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  try {
    const data = schema.parse(await req.json());
    let slug = slugifyAdmin(data.titleRu) || `solution-${Date.now()}`;
    if (await prisma.solution.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    const max = await prisma.solution.aggregate({ _max: { sortOrder: true } });
    const solution = await prisma.solution.create({
      data: {
        slug,
        titleRu: sanitizeText(data.titleRu, 200),
        titleEn: sanitizeText(data.titleEn || data.titleRu, 200),
        bodyRu: data.bodyRu || "",
        bodyEn: data.bodyEn || data.bodyRu || "",
        catalogSlug: data.catalogSlug?.trim() || null,
        published: data.published !== false,
        sortOrder: (max._max.sortOrder || 0) + 1,
      },
    });
    bustCms();
    return NextResponse.json({ solution }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
