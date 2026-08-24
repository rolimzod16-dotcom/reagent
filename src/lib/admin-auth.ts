import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import {
  assertAdminKey,
  clientIp,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security";

/** Require admin session OR valid x-admin-key header. */
export async function requireAdmin(req: Request): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-api:${ip}`, 120, 15 * 60 * 1000);
  if (!rl.ok) return { ok: false, response: rateLimitResponse(rl.retryAfterSec) };

  const session = await requireAdminSession();
  const keyOk = assertAdminKey(req.headers.get("x-admin-key"));
  if (!session && !keyOk) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}

export function slugifyAdmin(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/ж/g, "zh")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "ts")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ъ/g, "")
    .replace(/ы/g, "y")
    .replace(/ь/g, "")
    .replace(/э/g, "e")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
