import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireAdminSession } from "@/lib/auth";
import {
  ORDER_STATUSES,
  appendStatusHistory,
} from "@/lib/order-status";
import {
  assertAdminKey,
  clientIp,
  rateLimit,
  rateLimitResponse,
  sanitizeText,
} from "@/lib/security";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  trackingNumber: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

async function isAdminRequest(req: Request) {
  const session = await requireAdminSession();
  if (session) return true;
  return assertAdminKey(req.headers.get("x-admin-key"));
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: { product: { select: { slug: true, sku: true } } },
  });
  if (!inquiry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = inquiry.userId === session.id;
  if (!isOwner && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ inquiry });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const ip = clientIp(req);
  const rl = rateLimit(`inq-patch:${ip}`, 60, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const existing = await prisma.inquiry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let statusHistory = existing.statusHistory;
    if (data.status && data.status !== existing.status) {
      statusHistory = appendStatusHistory(
        existing.statusHistory,
        data.status,
        data.note ? sanitizeText(data.note, 500) : undefined
      );
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.trackingNumber !== undefined
          ? {
              trackingNumber: data.trackingNumber
                ? sanitizeText(data.trackingNumber, 120)
                : null,
            }
          : {}),
        ...(data.notes !== undefined
          ? {
              notes: data.notes ? sanitizeText(data.notes, 2000) : null,
            }
          : {}),
        ...(statusHistory !== existing.statusHistory
          ? { statusHistory }
          : {}),
      },
    });

    return NextResponse.json({
      inquiry: {
        id: inquiry.id,
        status: inquiry.status,
        trackingNumber: inquiry.trackingNumber,
        notes: inquiry.notes,
        statusHistory: inquiry.statusHistory,
        updatedAt: inquiry.updatedAt,
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
