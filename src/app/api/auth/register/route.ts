import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  linkGuestInquiries,
  setSessionCookie,
} from "@/lib/auth";
import {
  clientIp,
  isStrongPassword,
  rateLimit,
  rateLimitResponse,
  sanitizeText,
} from "@/lib/security";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  locale: z.enum(["ru", "en"]).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (!isStrongPassword(data.password)) {
      return NextResponse.json(
        {
          error:
            "Password must be 8+ chars with at least one letter and one number",
        },
        { status: 400 }
      );
    }

    const email = data.email.trim().toLowerCase();
    // block disposable-looking mass signup patterns (basic)
    if (email.length > 180) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // generic message to reduce enumeration slightly on register is harder;
      // keep 409 for UX but rate limited
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: sanitizeText(data.name, 120),
        company: data.company ? sanitizeText(data.company, 200) : null,
        phone: data.phone ? sanitizeText(data.phone, 40) : null,
        city: data.city ? sanitizeText(data.city, 120) : null,
        locale: data.locale || "ru",
        role: "client", // never accept role from client
      },
    });

    await linkGuestInquiries(user.id, email);

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          phone: user.phone,
          city: user.city,
          role: user.role,
        },
      },
      { status: 201 }
    );
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
