/**
 * Create or promote an admin user.
 * Usage:
 *   node scripts/create-admin.mjs email@example.com 'StrongPass1'
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = (process.argv[2] || "").trim().toLowerCase();
const password = process.argv[3] || "";

if (!email || !password || password.length < 8) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password min 8>");
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  await prisma.user.update({
    where: { email },
    data: { role: "admin", passwordHash },
  });
  console.log("Updated existing user to admin:", email);
} else {
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Admin",
      role: "admin",
    },
  });
  console.log("Created admin user:", email);
}

await prisma.$disconnect();
