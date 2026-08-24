import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugifyAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { sanitizeText } from "@/lib/security";

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  const brands = await prisma.manufacturer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ brands });
}

const schema = z.object({
  name: z.string().min(2).max(120),
  descriptionRu: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  website: z.string().max(300).optional().nullable(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  try {
    const data = schema.parse(await req.json());
    let slug = slugifyAdmin(data.name) || `brand-${Date.now()}`;
    if (await prisma.manufacturer.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    const brand = await prisma.manufacturer.create({
      data: {
        slug,
        name: sanitizeText(data.name, 120),
        descriptionRu: data.descriptionRu
          ? sanitizeText(data.descriptionRu, 2000)
          : null,
        descriptionEn: data.descriptionEn
          ? sanitizeText(data.descriptionEn, 2000)
          : null,
        website: data.website?.trim() || null,
        published: data.published !== false,
      },
    });
    bustCms();
    return NextResponse.json({ brand }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
