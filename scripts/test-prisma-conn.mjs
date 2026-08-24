import { PrismaClient } from "@prisma/client";

const url =
  process.env.TEST_URL ||
  "postgresql://postgres.ycguhqvuixcwmpqlxjif:Reagent_tj3883@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=30";

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

try {
  const rows = await prisma.$queryRaw`SELECT 1::int AS ok`;
  console.log("prisma ok", rows);
} catch (e) {
  console.error("prisma fail", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
