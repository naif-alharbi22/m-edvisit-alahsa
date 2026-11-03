import { z } from "zod";

/** Treat empty strings (common with docker-compose `VAR=`) as "not set". */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const booleanish = (fallback: boolean) =>
  z.preprocess((v) => {
    if (v === undefined || v === "") return fallback;
    if (typeof v === "boolean") return v;
    return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
  }, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    NEXTAUTH_SECRET: optionalString,
    NEXTAUTH_URL: optionalString,
    OPENAI_API_KEY: optionalString,
    OPENAI_TRIAGE_MODEL: z.string().default("gpt-4o"),
    OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: booleanish(false),
    EMAIL_FROM: z.string().default("Wisal <no-reply@wisal.local>"),
    APP_URL: optionalString,
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    RATE_LIMIT_ENABLED: booleanish(true),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXTAUTH_SECRET"],
          message: "NEXTAUTH_SECRET must be set to at least 32 characters in production (openssl rand -base64 32)",
        });
      }
      if (!env.NEXTAUTH_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXTAUTH_URL"],
          message: "NEXTAUTH_URL must be set in production (the public URL of the app)",
        });
      }
    }
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "EnvValidationError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
    );
  }
  return result.data;
}

/** Lazily parsed, cached environment. Safe to call from any server module. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}

/** Reset the cache (tests only). */
export function resetEnvCache() {
  cached = null;
}

export function getFeatures() {
  const env = getEnv();
  return {
    ai: Boolean(env.OPENAI_API_KEY),
    googleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    email: Boolean(env.SMTP_HOST),
  };
}

export function getAppUrl(): string {
  const env = getEnv();
  return (env.APP_URL || env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}
