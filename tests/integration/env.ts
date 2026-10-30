export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://medvisit:medvisit@localhost:5432/medvisit_test?schema=public";

export function applyTestEnv() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "integration-test-secret-integration-test-secret";
  process.env.RATE_LIMIT_ENABLED = "false";
  process.env.LOG_LEVEL = "error";
  delete process.env.SMTP_HOST;
  delete process.env.OPENAI_API_KEY;
}
