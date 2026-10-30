import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkRateLimit, enforceRateLimit, resetRateLimits } from "@/lib/rate-limit";
import { findProtectedRoute, homePathForRole, matchesPrefix } from "@/lib/roles";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { generateReference } from "@/lib/reference";
import { distanceKm } from "@/lib/geo";
import { parseSearchParams } from "@/lib/search-params";
import { nightsBetween, parseDateOnly, slugify, initials, localized } from "@/lib/utils";
import { TooManyRequestsError } from "@/server/errors";

describe("rate limiting", () => {
  it("allows up to the limit per window then blocks until reset", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 1000, t0).allowed).toBe(true);
    const blocked = checkRateLimit("k", 3, 1000, t0 + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(checkRateLimit("k", 3, 1000, t0 + 1001).allowed).toBe(true);
  });

  it("throws a 429 error when enforced", () => {
    const previous = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = "true";
    try {
      resetRateLimits();
      for (let i = 0; i < 5; i++) enforceRateLimit("register", "1.2.3.4");
      expect(() => enforceRateLimit("register", "1.2.3.4")).toThrow(TooManyRequestsError);
    } finally {
      process.env.RATE_LIMIT_ENABLED = previous;
    }
  });

  it("can be disabled for trusted environments", () => {
    const previous = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = "false";
    try {
      resetRateLimits();
      for (let i = 0; i < 20; i++) enforceRateLimit("register", "5.6.7.8");
    } finally {
      process.env.RATE_LIMIT_ENABLED = previous;
    }
  });
});

describe("roles and routing", () => {
  it("matches prefixes on segment boundaries", () => {
    expect(matchesPrefix("/hotel", "/hotel")).toBe(true);
    expect(matchesPrefix("/hotel/bookings", "/hotel")).toBe(true);
    expect(matchesPrefix("/hotels", "/hotel")).toBe(false);
    expect(findProtectedRoute("/hotels/al-hofuf")).toBeUndefined();
    expect(findProtectedRoute("/admin/users")?.roles).toEqual(["SUPER_ADMIN"]);
  });

  it("sends each role to its home", () => {
    expect(homePathForRole("SUPER_ADMIN")).toBe("/admin");
    expect(homePathForRole("HOSPITAL_ADMIN")).toBe("/hospital");
    expect(homePathForRole("HOTEL_MANAGER")).toBe("/hotel");
    expect(homePathForRole("PATIENT")).toBe("/dashboard");
    expect(homePathForRole(null)).toBe("/dashboard");
  });
});

describe("safeCallbackUrl", () => {
  it("only accepts same-origin relative paths", () => {
    expect(safeCallbackUrl("/en/dashboard")).toBe("/en/dashboard");
    expect(safeCallbackUrl("//evil.com")).toBeNull();
    expect(safeCallbackUrl("/\\evil.com")).toBeNull();
    expect(safeCallbackUrl("https://evil.com")).toBeNull();
    expect(safeCallbackUrl("/redirect?to=https://evil.com")).toBeNull();
    expect(safeCallbackUrl(undefined)).toBeNull();
  });
});

describe("helpers", () => {
  it("generates readable references", () => {
    const ref = generateReference("AP");
    expect(ref).toMatch(/^AP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(new Set(Array.from({ length: 200 }, () => generateReference("HB"))).size).toBe(200);
  });

  it("computes great-circle distance", () => {
    expect(distanceKm({ latitude: 25.3816, longitude: 49.5917 }, { latitude: 25.3789, longitude: 49.5872 })).toBeCloseTo(0.5, 1);
    expect(distanceKm({ latitude: null, longitude: 1 }, { latitude: 1, longitude: 1 })).toBeNull();
  });

  it("parses search params with per-key fallback", () => {
    const schema = z.object({ page: z.coerce.number().int().min(1).default(1), q: z.string().optional() });
    expect(parseSearchParams({ page: "abc", q: "x" }, schema)).toEqual({ page: 1, q: "x" });
    expect(parseSearchParams({ page: ["3", "4"] }, schema)).toEqual({ page: 3 });
  });

  it("handles dates, slugs, initials and localized fields", () => {
    expect(nightsBetween(parseDateOnly("2026-11-01"), parseDateOnly("2026-11-04"))).toBe(3);
    expect(slugify("Al-Moosa Specialist Hospital!")).toBe("al-moosa-specialist-hospital");
    expect(initials("Ahmed Hassan Ali")).toBe("AH");
    expect(localized({ name: "Clinic", nameAr: "عيادة" }, "name", "ar")).toBe("عيادة");
    expect(localized({ name: "Clinic", nameAr: "" }, "name", "ar")).toBe("Clinic");
  });
});
