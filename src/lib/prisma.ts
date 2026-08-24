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

  // Vercel *build* runs in the US against Tokyo Postgres — needs a longer wait
  // than a warm serverless isolate.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  const pool =
    globalForPrisma.pgPool ||
    new Pool({
      connectionString: pgConnectionString(raw),
      ssl: { rejectUnauthorized: false },
      // Serverless: 1 connection per isolate; use transaction pooler (:6543)
      max: isBuild ? 3 : process.env.VERCEL ? 1 : 5,
      idleTimeoutMillis: isBuild ? 20_000 : 5_000,
      connectionTimeoutMillis: isBuild ? 20_000 : 5_000,
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
