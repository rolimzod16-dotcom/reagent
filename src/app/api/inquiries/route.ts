import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  hashPassword,
  createSessionToken,
  setSessionCookie,
  linkGuestInquiries,
} from "@/lib/auth";
import {
  clientIp,
  isStrongPassword,
  rateLimit,
  rateLimitResponse,
  sanitizeText,
} from "@/lib/security";

const itemSchema = z.object({
  productId: z.string().max(64).optional().nullable(),
  productName: z.string().min(1).max(300),
  sku: z.string().max(80).optional().nullable(),
  qty: z.string().max(20).optional().nullable(),
});

const schema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().min(5).max(40),
  email: z.string().email().max(200),
  quantity: z.string().max(2000).optional().nullable(),
  message: z.string().max(3000).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  urgency: z.enum(["normal", "urgent"]).optional(),
  productId: z.string().max(64).optional().nullable(),
  productName: z.string().max(300).optional().nullable(),
  items: z.array(itemSchema).max(40).optional().nullable(),
  locale: z.enum(["ru", "en"]).optional(),
  source: z.enum(["guest", "cart"]).optional(),
  createAccount: z.boolean().optional(),
  // empty string or omitted when not creating account
  password: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`inquiry:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const session = await getSessionUser();

    if (data.source === "cart" && !session) {
      return NextResponse.json(
        { error: "Login required for cart checkout" },
        { status: 401 }
      );
    }

    // Validate productId if provided (prevent FK 500 / junk)
    let productName = data.productName
      ? sanitizeText(data.productName, 300)
      : null;
    let productId: string | null = null;
    if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { id: true, nameRu: true, nameEn: true, published: true },
      });
      if (product?.published) {
        productId = product.id;
        productName =
          data.locale === "en" ? product.nameEn : product.nameRu;
      }
    }

    const rawItems = data.items?.length ? data.items : null;
    const items = rawItems
      ? rawItems.map((i) => ({
          productId: i.productId || null,
          productName: sanitizeText(i.productName, 300),
          sku: i.sku ? sanitizeText(i.sku, 80) : null,
          qty: sanitizeText(String(i.qty || "1"), 20),
        }))
      : productName
        ? [
            {
              productId,
              productName,
              sku: null as string | null,
              qty: sanitizeText(String(data.quantity || "1"), 20),
            },
          ]
        : [];

    if (items.length === 0 && !data.message) {
      // allow empty product only if message present (general consult)
      // still require some payload
    }

    const quantity =
      data.quantity
        ? sanitizeText(data.quantity, 2000)
        : items.length
          ? items.map((i) => `${i.productName}: ${i.qty || 1}`).join("; ").slice(0, 2000)
          : null;

    let userId = session?.id || null;

    if (!userId && data.createAccount && data.password) {
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
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const passwordHash = await hashPassword(data.password);
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name: sanitizeText(data.name, 120),
            company: data.company
              ? sanitizeText(data.company, 200)
              : null,
            phone: sanitizeText(data.phone, 40),
            city: data.city ? sanitizeText(data.city, 120) : null,
            locale: data.locale || "ru",
            role: "client",
          },
        });
        userId = user.id;
        await linkGuestInquiries(user.id, email);
        const token = await createSessionToken(user);
        await setSessionCookie(token);
      }
      // if email taken: still create inquiry as guest, no auto-login
    }

    const email = data.email.trim().toLowerCase();

    const inquiry = await prisma.inquiry.create({
      data: {
        name: sanitizeText(data.name, 120),
        company: data.company ? sanitizeText(data.company, 200) : null,
        phone: sanitizeText(data.phone, 40),
        email,
        quantity,
        message: data.message ? sanitizeText(data.message, 3000) : null,
        city: data.city ? sanitizeText(data.city, 120) : null,
        urgency: data.urgency || "normal",
        itemsJson: items.length ? JSON.stringify(items) : null,
        productId,
        productName:
          productName || (items[0]?.productName ?? null),
        userId,
        locale: data.locale || "ru",
        status: "new",
        statusHistory: JSON.stringify([
          { status: "new", at: new Date().toISOString() },
        ]),
      },
    });

    return NextResponse.json(
      { id: inquiry.id, linked: !!userId },
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

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ inquiries: [] });
  }

  // Clients: only own records by userId (no email IDOR)
  if (session.role === "client") {
    const inquiries = await prisma.inquiry.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { product: { select: { slug: true, sku: true } } },
    });
    return NextResponse.json({ inquiries });
  }

  if (session.role === "admin") {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        product: { select: { slug: true, sku: true } },
        user: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json({ inquiries });
  }

  return NextResponse.json({ inquiries: [] });
}
