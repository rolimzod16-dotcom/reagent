import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!raw) throw new Error("DATABASE_URL is not set");
const connectionString = raw.replace(/[?&]sslmode=[^&]*/g, "");
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "TelegramSubscriber" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramSubscriber_pkey" PRIMARY KEY ("id")
)`);
await prisma.$executeRawUnsafe(
  `CREATE UNIQUE INDEX IF NOT EXISTS "TelegramSubscriber_chatId_key" ON "TelegramSubscriber"("chatId")`
);
await prisma.$executeRawUnsafe(
  `CREATE INDEX IF NOT EXISTS "TelegramSubscriber_createdAt_idx" ON "TelegramSubscriber"("createdAt")`
);
console.log("TelegramSubscriber table ready");
await prisma.$disconnect();
await pool.end();
