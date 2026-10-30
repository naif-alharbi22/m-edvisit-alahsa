/**
 * Time bucketing for analytics in the business time zone (Asia/Riyadh,
 * UTC+3, no daylight saving). Pure functions — no database access.
 */
import type { AnalyticsRange } from "@/lib/validators/common";

export const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY = 86_400_000;

export type Granularity = "day" | "week" | "month";

export interface Bucket {
  key: string;
  /** Inclusive start (UTC instant of local midnight). */
  start: Date;
  /** Exclusive end. */
  end: Date;
}

export interface ResolvedRange {
  range: AnalyticsRange;
  granularity: Granularity;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  buckets: Bucket[];
}

/** Local (Riyadh) calendar parts of an instant. */
function localParts(date: Date) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate(), dow: shifted.getUTCDay() };
}

/** UTC instant of local midnight for the given local calendar date. */
function localMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - TZ_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Bucket key for an instant — must match the SQL expression in queries.ts. */
export function bucketKey(date: Date, granularity: Granularity): string {
  const { y, m, d, dow } = localParts(date);
  if (granularity === "month") return `${y}-${pad(m + 1)}`;
  if (granularity === "day") return `${y}-${pad(m + 1)}-${pad(d)}`;
  // ISO week starting Monday.
  const mondayOffset = (dow + 6) % 7;
  const monday = new Date(Date.UTC(y, m, d) - mondayOffset * DAY);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

/** Bucket key for a DATE column value (already a calendar date, stored as UTC midnight). */
export function dateOnlyBucketKey(date: Date, granularity: Granularity): string {
  // UTC midnight + 3h is still the same calendar day, so bucketKey reads it back unchanged.
  return bucketKey(date, granularity);
}

export function resolveRange(range: AnalyticsRange, now: Date = new Date()): ResolvedRange {
  const { y, m, d, dow } = localParts(now);
  const buckets: Bucket[] = [];
  let granularity: Granularity;

  if (range === "30d") {
    granularity = "day";
    for (let i = 29; i >= 0; i--) {
      const start = localMidnight(y, m, d - i);
      const end = localMidnight(y, m, d - i + 1);
      buckets.push({ key: bucketKey(start, "day"), start, end });
    }
  } else if (range === "90d") {
    granularity = "week";
    const mondayOffset = (dow + 6) % 7;
    for (let i = 12; i >= 0; i--) {
      const start = localMidnight(y, m, d - mondayOffset - i * 7);
      const end = localMidnight(y, m, d - mondayOffset - i * 7 + 7);
      buckets.push({ key: bucketKey(start, "week"), start, end });
    }
  } else {
    granularity = "month";
    for (let i = 11; i >= 0; i--) {
      const start = localMidnight(y, m - i, 1);
      const end = localMidnight(y, m - i + 1, 1);
      buckets.push({ key: bucketKey(start, "month"), start, end });
    }
  }

  const start = buckets[0]!.start;
  const end = buckets[buckets.length - 1]!.end;
  const span = end.getTime() - start.getTime();
  return {
    range,
    granularity,
    start,
    end,
    prevStart: new Date(start.getTime() - span),
    prevEnd: start,
    buckets,
  };
}

/** Local midnight today and tomorrow (UTC instants). */
export function localToday(now: Date = new Date()) {
  const { y, m, d } = localParts(now);
  return { start: localMidnight(y, m, d), end: localMidnight(y, m, d + 1) };
}

/** Today's local calendar date as a DATE-column value (UTC midnight). */
export function localDateOnly(now: Date = new Date()): Date {
  const { y, m, d } = localParts(now);
  return new Date(Date.UTC(y, m, d));
}

/** Converts a local-midnight instant to the DATE-column value for that calendar day. */
export function instantToDateOnly(instant: Date): Date {
  const { y, m, d } = localParts(instant);
  return new Date(Date.UTC(y, m, d));
}
