import { applyTestEnv } from "./env";

// Must run before any module imports the Prisma client.
applyTestEnv();

const { beforeAll, afterAll } = await import("vitest");
const { prisma } = await import("@/lib/prisma");
const { resetRateLimits } = await import("@/lib/rate-limit");

beforeAll(async () => {
  resetRateLimits();
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
