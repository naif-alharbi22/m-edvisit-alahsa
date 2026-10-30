import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  const base = { DATABASE_URL: "postgresql://u:p@localhost/db" };

  it("applies defaults in development", () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.RATE_LIMIT_ENABLED).toBe(true);
    expect(env.MAX_UPLOAD_MB).toBe(10);
    expect(env.OPENAI_CHAT_MODEL).toBe("gpt-4o-mini");
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({ ...base, OPENAI_API_KEY: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" });
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });

  it("requires a strong secret and public URL in production", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow(EnvValidationError);
    expect(() => parseEnv({ ...base, NODE_ENV: "production", NEXTAUTH_SECRET: "short", NEXTAUTH_URL: "https://x.co" })).toThrow(/NEXTAUTH_SECRET/);
    expect(parseEnv({ ...base, NODE_ENV: "production", NEXTAUTH_SECRET: "x".repeat(32), NEXTAUTH_URL: "https://x.co" }).NODE_ENV).toBe("production");
  });

  it("requires Google credentials in pairs and a database URL", () => {
    expect(() => parseEnv({ ...base, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_ID/);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("parses booleans", () => {
    expect(parseEnv({ ...base, RATE_LIMIT_ENABLED: "false" }).RATE_LIMIT_ENABLED).toBe(false);
    expect(parseEnv({ ...base, SMTP_SECURE: "1" }).SMTP_SECURE).toBe(true);
  });
});
