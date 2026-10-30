/**
 * Minimal structured JSON logger. Writes one JSON object per line so logs can
 * be shipped to any aggregator (Loki, CloudWatch, Datadog) without parsing.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL as Level | undefined) ?? "info";
  return LEVELS[configured] ?? LEVELS.info;
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < threshold()) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      entry[k] = k === "err" || k === "error" ? serializeError(v) : v;
    }
  }
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
