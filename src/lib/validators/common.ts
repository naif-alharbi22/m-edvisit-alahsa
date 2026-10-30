import { z } from "zod";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Optional, nullable trimmed text where "" becomes null (clears the DB column). */
export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

export const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const optionalUrl = z.preprocess(emptyToNull, z.url().max(500).nullable().optional());

export const optionalEmail = z.preprocess(
  emptyToNull,
  z.email().max(200).transform((v) => v.toLowerCase()).nullable().optional()
);

export const optionalId = z.preprocess(emptyToNull, z.string().min(1).max(64).nullable().optional());

export const stringList = (maxItems: number, maxLen = 80) =>
  z
    .array(z.string().trim().min(1).max(maxLen))
    .max(maxItems)
    .transform((arr) => Array.from(new Set(arr)));

export const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().pipe(schema).nullable().optional());

/** YYYY-MM-DD */
export const isoDate = z.iso.date();

export const paginationSchema = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export const listQuerySchema = paginationSchema.extend({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  from: z.preprocess(emptyToUndefined, isoDate.optional()),
  to: z.preprocess(emptyToUndefined, isoDate.optional()),
});

/** Operational list views: upcoming (default, soonest first), past (latest first) or all. */
export const listViewSchema = z.preprocess(
  emptyToUndefined,
  z.enum(["upcoming", "past", "all"]).default("upcoming")
);
export type ListView = "upcoming" | "past" | "all";

export const analyticsRangeSchema = z.enum(["30d", "90d", "12m"]).default("90d");
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
