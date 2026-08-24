import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugifyAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { sanitizeText } from "@/lib/security";

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const articles = await prisma.article.findMany({
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ articles });
}

const schema = z.object({
  titleRu: z.string().min(2).max(250),
  titleEn: z.string().max(250).optional(),
  excerptRu: z.string().max(500).optional(),
  excerptEn: z.string().max(500).optional(),
  bodyRu: z.string().min(2).max(20000),
  bodyEn: z.string().max(20000).optional(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  try {
    const data = schema.parse(await req.json());
    let slug = slugifyAdmin(data.titleRu) || `article-${Date.now()}`;
    if (await prisma.article.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    const article = await prisma.article.create({
      data: {
        slug,
        titleRu: sanitizeText(data.titleRu, 250),
        titleEn: sanitizeText(data.titleEn || data.titleRu, 250),
        excerptRu: data.excerptRu ? sanitizeText(data.excerptRu, 500) : null,
        excerptEn: data.excerptEn ? sanitizeText(data.excerptEn, 500) : null,
        bodyRu: data.bodyRu,
        bodyEn: data.bodyEn || data.bodyRu,
        published: data.published !== false,
        publishedAt: new Date(),
      },
    });
    bustCms();
    return NextResponse.json({ article }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
