import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/** In-memory sliding window rate limiter (per serverless instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now >= cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (cur.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }
  cur.count += 1;
  return { ok: true, remaining: limit - cur.count, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/** Constant-time string compare (hashes first so lengths may differ). */
export function secureEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function getAdminKey(): string | null {
  const key = process.env.ADMIN_KEY?.trim();
  if (!key || key.length < 16) return null;
  // Reject known weak defaults
  const weak = new Set([
    "reagent-admin",
    "admin",
    "password",
    "secret",
    "123456",
  ]);
  if (weak.has(key.toLowerCase())) return null;
  return key;
}

export function assertAdminKey(headerValue: string | null): boolean {
  const expected = getAdminKey();
  if (!expected || !headerValue) return false;
  return secureEqual(headerValue, expected);
}

export function getAuthSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const isProd =
    process.env.NODE_ENV === "production";

  if (!s || s.length < 32) {
    if (isProd) {
      throw new Error(
        "AUTH_SECRET must be set (min 32 chars) in production"
      );
    }
    return new TextEncoder().encode(
      "reagent-dev-only-secret-not-for-production!!"
    );
  }
  if (
    s.includes("change-me") ||
    s === "reagent-prod-secret-change-me-32chars-min"
  ) {
    if (isProd) {
      console.warn(
        "[security] AUTH_SECRET looks like a placeholder — rotate it"
      );
    }
  }
  return new TextEncoder().encode(s);
}

/** Prevent open redirects: only same-site relative paths. */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  // block protocol-relative and junk
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;
  return trimmed.slice(0, 500);
}

/** Strip control chars / excessive length from free text. */
export function sanitizeText(input: string, max = 2000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

export function isStrongPassword(pw: string): boolean {
  if (pw.length < 8 || pw.length > 100) return false;
  // at least one letter and one number preferred; require 8+ chars minimum
  return /[A-Za-zА-Яа-я]/.test(pw) && /[0-9]/.test(pw);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
