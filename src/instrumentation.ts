/**
 * Runs once when a Next.js server instance starts. Validates configuration so
 * a misconfigured deployment fails fast with a readable message instead of
 * erroring on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateStartup } = await import("./instrumentation-node");
    validateStartup();
  }
}

export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/logger");
  logger.error("Unhandled request error", { err, path: request.path, method: request.method });
}
