import { TooManyRequestsError } from "@/server/errors";

/**
 * Fixed-window in-memory rate limiter.
 *
 * Suitable for a single application instance. When running several replicas,
 * put the limits at the reverse proxy (see deploy/nginx.conf) or back this with
 * Redis; the call sites only depend on `enforceRateLimit`.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  triage: { limit: 10, windowMs: 60 * 60_000 },
  chat: { limit: 40, windowMs: 10 * 60_000 },
  booking: { limit: 20, windowMs: 60 * 60_000 },
} as const;

/** Throws TooManyRequestsError when the key exceeds the named limit. */
export function enforceRateLimit(name: keyof typeof RATE_LIMITS, identity: string) {
  if (["0", "false", "no", "off"].includes(String(process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase())) return;
  const { limit, windowMs } = RATE_LIMITS[name];
  const result = checkRateLimit(`${name}:${identity}`, limit, windowMs);
  if (!result.allowed) throw new TooManyRequestsError(result.retryAfterSeconds);
}

/** Clears all buckets (tests only). */
export function resetRateLimits() {
  buckets.clear();
}
