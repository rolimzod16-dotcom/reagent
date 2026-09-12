import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/** Strip sslmode so Node pg can use rejectUnauthorized:false (Supabase pooler). */
function pgConnectionString(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

function createPrisma() {
  const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!raw) {
    throw new Error("DATABASE_URL (or DIRECT_URL) is not set");
  }

  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  // Cloudflare Workers / OpenNext: one short-lived connection per isolate.
  const serverless =
    !!process.env.CF_PAGES ||
    !!process.env.CLOUDFLARE ||
    process.env.NEXT_RUNTIME === "edge" ||
    typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !==
      "undefined";

  const pool =
    globalForPrisma.pgPool ||
    new Pool({
      connectionString: pgConnectionString(raw),
      ssl: { rejectUnauthorized: false },
      // Reuse warm Vercel connections instead of reopening TLS for every query.
      // Keep the pool deliberately small because each function instance owns one.
      max: isBuild ? 3 : 2,
      maxUses: serverless ? 1 : 500,
      idleTimeoutMillis: isBuild ? 20_000 : 30_000,
      connectionTimeoutMillis: isBuild ? 20_000 : 8_000,
      allowExitOnIdle: true,
    });

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createPrisma();

// Always pin on globalThis so warm Vercel isolates reuse one client/pool
globalForPrisma.prisma = prisma;
