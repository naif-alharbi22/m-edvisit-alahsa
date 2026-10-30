/**
 * Locale-aware formatting shared by server and client components. Dates are
 * shown in the business time zone; DATE-only values (hotel stays) in UTC so the
 * calendar day never shifts.
 */
import { APP_TIME_ZONE } from "@/i18n/config";

const intlLocale = (locale: string) => (locale === "ar" ? "ar-SA" : "en-US");

export function formatNumber(value: number, locale: string, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2, ...options }).format(value);
}

export function formatCompact(value: number, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatCurrency(value: number | null | undefined, locale: string, currency = "SAR", compact = false) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatPercent(ratio: number, locale: string, digits = 0) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(ratio);
}

/** Signed percentage for deltas (e.g. +12%, −4%); caps absurd values from tiny baselines. */
export function formatDelta(change: number, locale: string) {
  const capped = Math.max(-9.99, Math.min(9.99, change));
  const text = new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: Math.abs(capped) < 0.1 ? 1 : 0,
    signDisplay: "exceptZero",
  }).format(capped);
  return Math.abs(change) > 9.99 ? `${text}+` : text;
}

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

export function formatDate(value: DateInput, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: APP_TIME_ZONE, ...options }).format(toDate(value));
}

export function formatDateTime(value: DateInput, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toDate(value));
}

/** For DATE columns (stored as UTC midnight): format without shifting the day. */
export function formatDateOnly(value: DateInput, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options }).format(toDate(value));
}

/** Axis label for an analytics bucket key ("2026-10-30" or "2026-10"). */
export function formatBucket(key: string, granularity: "day" | "week" | "month", locale: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  const options: Intl.DateTimeFormatOptions =
    granularity === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options }).format(date);
}

/** Value for <input type="datetime-local"> in the business time zone. */
export function toLocalInputValue(value: DateInput): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(toDate(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Parses a datetime-local value entered in the business time zone (UTC+3) into an ISO instant. */
export function fromLocalInputValue(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}
