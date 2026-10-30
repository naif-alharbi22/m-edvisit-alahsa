import { describe, expect, it } from "vitest";
import {
  formatBucket,
  formatCompact,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatDelta,
  formatPercent,
  fromLocalInputValue,
  toLocalInputValue,
} from "@/lib/format";

const BIDI = /[‎‏؜]/;

describe("formatCurrency", () => {
  it("formats SAR in both locales with Latin digits", () => {
    expect(formatCurrency(1234, "en")).toBe("SAR 1,234");
    expect(formatCurrency(1234.5, "en")).toBe("SAR 1,234.5");
    expect(formatCurrency(1234, "ar")).toBe("1,234 ر.س");
    expect(formatCurrency(null, "en")).toBe("—");
  });

  it("supports compact amounts", () => {
    expect(formatCurrency(4_200_000, "en", "SAR", true)).toBe("SAR 4.2M");
    expect(formatCurrency(335_900, "ar", "SAR", true)).toBe("335.9 ألف ر.س");
  });
});

describe("formatCompact / formatPercent / formatDelta", () => {
  it("is deterministic and free of bidi control characters", () => {
    for (const locale of ["en", "ar"]) {
      expect(formatCompact(1500, locale)).not.toMatch(BIDI);
      expect(formatPercent(0.256, locale)).not.toMatch(BIDI);
    }
    expect(formatCompact(950, "en")).toBe("950");
    expect(formatCompact(12_345, "en")).toBe("12.3K");
    expect(formatPercent(0.256, "en", 1)).toBe("25.6%");
  });

  it("signs deltas and caps absurd values", () => {
    expect(formatDelta(0.125)).toBe("+13%");
    expect(formatDelta(-0.04)).toBe("-4%");
    expect(formatDelta(0.05)).toBe("+5%");
    expect(formatDelta(1499)).toBe("+999%+");
  });
});

describe("dates", () => {
  it("formats instants in Riyadh time and uses the Gregorian calendar in Arabic", () => {
    expect(formatDateTime("2026-11-02T05:00:00Z", "en")).toBe("Nov 2, 2026, 8:00 AM");
    const ar = formatDateTime("2026-11-02T05:00:00Z", "ar");
    expect(ar).toContain("2026");
    expect(ar).toContain("نوفمبر");
    expect(ar).not.toMatch(BIDI);
  });

  it("does not shift DATE-only values", () => {
    expect(formatDateOnly("2026-11-02T00:00:00.000Z", "en")).toBe("Nov 2, 2026");
  });

  it("labels buckets", () => {
    expect(formatBucket("2026-10-26", "week", "en")).toBe("Oct 26");
    expect(formatBucket("2026-10", "month", "en")).toBe("Oct 26");
  });

  it("round-trips datetime-local values in the business time zone", () => {
    const iso = "2026-11-02T07:30:00.000Z";
    const local = toLocalInputValue(iso);
    expect(local).toBe("2026-11-02T10:30");
    expect(fromLocalInputValue(local)).toBe(iso);
  });
});
