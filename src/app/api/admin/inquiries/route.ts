import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import {
  assertAdminKey,
  clientIp,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-list:${ip}`, 40, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const session = await requireAdminSession();
  const keyOk = assertAdminKey(req.headers.get("x-admin-key"));

  if (!session && !keyOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If ADMIN_KEY is not configured and no admin session — refuse
  // (assertAdminKey already fails without env)

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { select: { slug: true, sku: true, nameRu: true } },
      user: { select: { email: true, name: true, company: true, phone: true } },
    },
  });

  return NextResponse.json({
    inquiries,
    counts: {
      total: inquiries.length,
      new: inquiries.filter((i) => i.status === "new").length,
      processing: inquiries.filter((i) => i.status === "processing").length,
      delivered: inquiries.filter((i) => i.status === "delivered").length,
      urgent: inquiries.filter((i) => i.urgency === "urgent").length,
    },
  });
}
