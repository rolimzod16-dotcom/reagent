import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthSecret } from "@/lib/security";

const COOKIE = "reagent_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  city: string | null;
  role: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    // role is NOT trusted from JWT alone — always re-read from DB
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function readSessionToken(
  token: string
): Promise<{ id: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const secure =
    process.env.NODE_ENV === "production";
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const secure =
    process.env.NODE_ENV === "production";
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const payload = await readSessionToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return null;

    // Email mismatch → cookie invalid (account changed)
    if (user.email.toLowerCase() !== payload.email.toLowerCase()) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      phone: user.phone,
      city: user.city,
      role: user.role === "admin" ? "admin" : "client",
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Link guest inquiries (same email) to a newly registered user. */
export async function linkGuestInquiries(userId: string, email: string) {
  await prisma.inquiry.updateMany({
    where: {
      email: email.toLowerCase(),
      userId: null,
    },
    data: { userId },
  });
}

export { COOKIE as SESSION_COOKIE };
