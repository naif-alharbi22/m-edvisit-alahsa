import { EnvValidationError, parseEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Node.js-only startup checks (kept out of instrumentation.ts so Edge bundling stays clean). */
export function validateStartup() {
  try {
    const env = parseEnv(process.env);
    logger.info("MedVisit server starting", {
      env: env.NODE_ENV,
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "unknown",
      ai: Boolean(env.OPENAI_API_KEY),
      googleAuth: Boolean(env.GOOGLE_CLIENT_ID),
      email: Boolean(env.SMTP_HOST),
      rateLimit: env.RATE_LIMIT_ENABLED,
    });
    if (!env.OPENAI_API_KEY) logger.warn("OPENAI_API_KEY is not set: AI triage and the assistant will return 503");
  } catch (err) {
    if (err instanceof EnvValidationError) {
      logger.error(err.message);
      if (process.env.NODE_ENV === "production") process.exit(1);
    } else {
      throw err;
    }
  }
}
