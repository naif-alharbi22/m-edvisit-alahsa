import { execSync } from "node:child_process";
import pg from "pg";
import { TEST_DATABASE_URL, applyTestEnv } from "./env";

/** Rebuilds the test database schema from the committed migrations once per run. */
export default async function globalSetup() {
  applyTestEnv();
  const url = new URL(TEST_DATABASE_URL);
  if (!/test/i.test(url.pathname)) {
    throw new Error(`Refusing to reset non-test database "${url.pathname}". Use a database whose name contains "test".`);
  }
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } });
}
