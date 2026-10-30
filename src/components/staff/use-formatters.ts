"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import {
  formatBucket,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { countryName } from "@/lib/countries";

/** Locale-bound formatters for client components. */
export function useFormatters() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      number: (v: number) => formatNumber(v, locale),
      compact: (v: number) => formatCompact(v, locale),
      currency: (v: number | null | undefined, currency = "SAR") => formatCurrency(v, locale, currency),
      currencyCompact: (v: number) => formatCurrency(v, locale, "SAR", true),
      percent: (v: number, digits = 0) => formatPercent(v, locale, digits),
      date: (v: Date | string) => formatDate(v, locale),
      dateTime: (v: Date | string) => formatDateTime(v, locale),
      dateOnly: (v: Date | string) => formatDateOnly(v, locale),
      shortDate: (v: Date | string) => formatDate(v, locale, { day: "numeric", month: "short" }),
      time: (v: Date | string) => formatDate(v, locale, { hour: "2-digit", minute: "2-digit" }),
      bucket: (key: string, g: "day" | "week" | "month") => formatBucket(key, g, locale),
      country: (code: string | null | undefined) => countryName(code, locale),
    }),
    [locale]
  );
}
