import type { ZodType } from "zod";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Validates page search params; invalid values fall back to schema defaults instead of erroring. */
export function parseSearchParams<T>(raw: RawSearchParams, schema: ZodType<T>): T {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined) flat[k] = value;
  }
  const parsed = schema.safeParse(flat);
  if (parsed.success) return parsed.data;
  // Drop the offending keys and retry so one bad param doesn't reset everything.
  const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  for (const key of bad) delete flat[key];
  const retry = schema.safeParse(flat);
  return retry.success ? retry.data : schema.parse({});
}
