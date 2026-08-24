import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clientIp,
  isStrongPassword,
  rateLimit,
  rateLimitResponse,
  sanitizeText,
} from "@/lib/security";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      phone: user.phone,
      city: user.city,
      role: user.role,
    },
  });
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  password: z.string().min(8).max(100).optional(),
  currentPassword: z.string().max(100).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`me-patch:${session.id}:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await req.json();
    // Reject mass-assignment of privileged fields
    if (
      body &&
      typeof body === "object" &&
      ("role" in body || "email" in body || "id" in body || "passwordHash" in body)
    ) {
      return NextResponse.json({ error: "Forbidden fields" }, { status: 400 });
    }

    const data = updateSchema.parse(body);

    const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let passwordHash: string | undefined;
    if (data.password) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: "Current password required" },
          { status: 400 }
        );
      }
      if (!isStrongPassword(data.password)) {
        return NextResponse.json(
          {
            error:
              "Password must be 8+ chars with at least one letter and one number",
          },
          { status: 400 }
        );
      }
      const ok = await verifyPassword(
        data.currentPassword,
        dbUser.passwordHash
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Current password is wrong" },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        ...(data.name !== undefined
          ? { name: sanitizeText(data.name, 120) }
          : {}),
        ...(data.company !== undefined
          ? { company: data.company ? sanitizeText(data.company, 200) : null }
          : {}),
        ...(data.phone !== undefined
          ? { phone: data.phone ? sanitizeText(data.phone, 40) : null }
          : {}),
        ...(data.city !== undefined
          ? { city: data.city ? sanitizeText(data.city, 120) : null }
          : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        phone: user.phone,
        city: user.city,
        role: user.role === "admin" ? "admin" : "client",
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
