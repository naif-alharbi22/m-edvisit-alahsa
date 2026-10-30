import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Picks the Arabic variant of a field when the locale is Arabic and the value exists. */
export function localized<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T & string,
  locale: string
): string {
  const ar = entity[`${field}Ar` as keyof T];
  if (locale === "ar" && typeof ar === "string" && ar.trim()) return ar;
  const base = entity[field];
  return typeof base === "string" ? base : "";
}

export function formatMoney(amount: number | null | undefined, currency = "SAR", locale = "en"): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Number of nights between two dates (date-only semantics, UTC). */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const start = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate());
  const end = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

/** Parses a YYYY-MM-DD string as a UTC midnight date. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
