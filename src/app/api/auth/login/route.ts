import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  clientIp,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 15, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.trim().toLowerCase();

    // Per-email throttle (brute force)
    const rlEmail = rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000);
    if (!rlEmail.ok) return rateLimitResponse(rlEmail.retryAfterSec);

    const user = await prisma.user.findUnique({ where: { email } });
    // Constant-ish work: always hash-ish delay if user missing
    if (!user) {
      // Dummy bcrypt hash to keep response time similar (anti user-enum timing)
      await verifyPassword(
        data.password,
        "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.KxqKxqKxqK"
      );
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

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
