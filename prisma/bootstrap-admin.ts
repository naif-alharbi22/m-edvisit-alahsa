/**
 * Creates (or updates) the platform super-administrator from environment
 * variables. Safe to run on every deployment.
 *
 *   ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='...' npm run db:bootstrap-admin
 *
 * If ADMIN_EMAIL is not set the script exits without changes.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Platform Administrator";

  if (!email) {
    console.log("ADMIN_EMAIL not set — skipping admin bootstrap.");
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: "SUPER_ADMIN",
          isActive: true,
          ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
        },
      });
      console.log(`Super admin ${email} already exists — ensured role and active status${password ? " and updated password" : ""}.`);
      return;
    }

    if (!password || password.length < 12) {
      throw new Error("ADMIN_PASSWORD must be set (min 12 characters) to create the super admin account.");
    }

    await prisma.user.create({
      data: { email, name, password: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" },
    });
    console.log(`Created super admin ${email}.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
