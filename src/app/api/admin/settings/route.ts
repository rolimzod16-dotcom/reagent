import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustCms } from "@/lib/cms-admin";
import { ensureCmsDefaults } from "@/lib/cms";
import { sanitizeText } from "@/lib/security";

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  await ensureCmsDefaults();
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  return NextResponse.json({ settings });
}

const schema = z.object({
  email: z.string().email().max(120),
  phone: z.string().min(5).max(40),
  addressRu: z.string().max(300).optional(),
  addressEn: z.string().max(300).optional(),
  hoursRu: z.string().max(120).optional(),
  hoursEn: z.string().max(120).optional(),
  noteRu: z.string().max(500).optional(),
  noteEn: z.string().max(500).optional(),
});

export async function PUT(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;
  try {
    const data = schema.parse(await req.json());
    await ensureCmsDefaults();
    const settings = await prisma.siteSettings.update({
      where: { id: "main" },
      data: {
        email: data.email.trim(),
        phone: sanitizeText(data.phone, 40),
        addressRu: sanitizeText(data.addressRu || "", 300),
        addressEn: sanitizeText(data.addressEn || "", 300),
        hoursRu: sanitizeText(data.hoursRu || "", 120),
        hoursEn: sanitizeText(data.hoursEn || "", 120),
        noteRu: sanitizeText(data.noteRu || "", 500),
        noteEn: sanitizeText(data.noteEn || "", 500),
      },
    });
    bustCms();
    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
