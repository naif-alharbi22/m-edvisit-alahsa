/**
 * Locale-aware formatting shared by server and client components.
 *
 * Output must be byte-identical between Node (SSR) and the browser (hydration),
 * whose ICU builds differ for Arabic (bidi marks, compact suffixes, default
 * Hijri calendar for ar-SA). So we:
 *  - format digits with the stable en-US patterns (Latin digits, common in Saudi UIs),
 *  - use Arabic month/day names with the Gregorian calendar,
 *  - add the Arabic currency/compact words ourselves,
 *  - strip bidi control characters.
 * Dates use the business time zone; DATE-only values (hotel stays) use UTC so
 * the calendar day never shifts.
 */
import { APP_TIME_ZONE } from "@/i18n/config";

const NUM_LOCALE = "en-US";
const BIDI_CONTROLS = /[‎‏؜⁦-⁩]/g;
const clean = (s: string) => s.replace(BIDI_CONTROLS, "").replace(/ /g, " ");
const dateLocale = (locale: string) => (locale === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-US");

const CURRENCY_AR: Record<string, string> = { SAR: "ر.س", USD: "$", EUR: "€", AED: "د.إ", KWD: "د.ك" };

export function formatNumber(value: number, _locale?: string, options: Intl.NumberFormatOptions = {}) {
  return clean(new Intl.NumberFormat(NUM_LOCALE, { maximumFractionDigits: 2, ...options }).format(value));
}

function compactParts(value: number): { num: string; suffix: "" | "K" | "M" | "B" } {
  const abs = Math.abs(value);
  const fmt = (v: number) => formatNumber(v, undefined, { maximumFractionDigits: 1 });
  if (abs >= 1e9) return { num: fmt(value / 1e9), suffix: "B" };
  if (abs >= 1e6) return { num: fmt(value / 1e6), suffix: "M" };
  if (abs >= 1e3) return { num: fmt(value / 1e3), suffix: "K" };
  return { num: formatNumber(Math.round(value)), suffix: "" };
}

const COMPACT_AR = { K: " ألف", M: " مليون", B: " مليار", "": "" } as const;

export function formatCompact(value: number, locale: string) {
  const { num, suffix } = compactParts(value);
  return locale === "ar" ? `${num}${COMPACT_AR[suffix]}` : `${num}${suffix}`;
}

export function formatCurrency(value: number | null | undefined, locale: string, currency = "SAR", compact = false) {
  if (value === null || value === undefined) return "—";
  const amount = compact ? formatCompact(value, locale) : formatNumber(value, locale, { maximumFractionDigits: value % 1 === 0 ? 0 : 2 });
  if (locale === "ar") return `${amount} ${CURRENCY_AR[currency] ?? currency}`;
  return `${currency} ${amount}`;
}

export function formatPercent(ratio: number, _locale?: string, digits = 0) {
  return clean(new Intl.NumberFormat(NUM_LOCALE, { style: "percent", maximumFractionDigits: digits }).format(ratio));
}

/** Signed percentage for deltas (e.g. +12%, -4%); caps absurd values from tiny baselines. */
export function formatDelta(change: number, _locale?: string) {
  const capped = Math.max(-9.99, Math.min(9.99, change));
  const text = clean(
    new Intl.NumberFormat(NUM_LOCALE, {
      style: "percent",
      maximumFractionDigits: Math.abs(capped) < 0.1 ? 1 : 0,
      signDisplay: "exceptZero",
    }).format(capped)
  );
  return Math.abs(change) > 9.99 ? `${text}+` : text;
}

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

export function formatDate(value: DateInput, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return clean(new Intl.DateTimeFormat(dateLocale(locale), { timeZone: APP_TIME_ZONE, ...options }).format(toDate(value)));
}

export function formatDateTime(value: DateInput, locale: string) {
  return clean(
    new Intl.DateTimeFormat(dateLocale(locale), {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(toDate(value))
  );
}

/** For DATE columns (stored as UTC midnight): format without shifting the day. */
export function formatDateOnly(value: DateInput, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return clean(new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", ...options }).format(toDate(value)));
}

/** Axis label for an analytics bucket key ("2026-10-30" or "2026-10"). */
export function formatBucket(key: string, granularity: "day" | "week" | "month", locale: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  const options: Intl.DateTimeFormatOptions =
    granularity === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" };
  return clean(new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", ...options }).format(date));
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
