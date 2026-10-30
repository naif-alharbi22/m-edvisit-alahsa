/**
 * Creates the platform super-administrator from environment variables, or
 * makes sure an existing one still has the SUPER_ADMIN role and is active.
 * Safe to run on every deployment (the docker migrate job does).
 *
 *   ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='...' npm run db:bootstrap-admin
 *
 * An existing admin's password is only replaced when ADMIN_RESET_PASSWORD=true,
 * so a password changed in the app survives redeploys.
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
  const resetPassword = ["1", "true", "yes"].includes((process.env.ADMIN_RESET_PASSWORD ?? "").toLowerCase());

  if (!email) {
    console.log("ADMIN_EMAIL not set — skipping admin bootstrap.");
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (resetPassword && (!password || password.length < 12)) {
        throw new Error("ADMIN_RESET_PASSWORD=true requires ADMIN_PASSWORD (min 12 characters).");
      }
      await prisma.user.update({
        where: { email },
        data: {
          role: "SUPER_ADMIN",
          isActive: true,
          ...(resetPassword && password ? { password: await bcrypt.hash(password, 12) } : {}),
        },
      });
      console.log(
        `Super admin ${email} already exists — ensured role and active status${resetPassword ? " and reset the password" : ""}.`
      );
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
