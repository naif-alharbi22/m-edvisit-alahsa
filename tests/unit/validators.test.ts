import { describe, expect, it } from "vitest";
import { registerSchema, changePasswordSchema } from "@/lib/validators/auth";
import { createAppointmentSchema, staffUpdateAppointmentSchema } from "@/lib/validators/appointment";
import { createBookingSchema, availabilityQuerySchema } from "@/lib/validators/booking";
import { facilityInputSchema, reviewInputSchema, roomTypeInputSchema } from "@/lib/validators/catalog";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validators/user";
import { analyticsRangeSchema, paginationSchema } from "@/lib/validators/common";

const isoDay = (offset: number) => new Date(Date.now() + 3 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

describe("auth validators", () => {
  it("normalizes email and enforces password rules", () => {
    const ok = registerSchema.parse({ name: "Ahmed", email: "  Ahmed@Example.COM ", password: "abcd1234" });
    expect(ok.email).toBe("ahmed@example.com");
    expect(ok.locale).toBe("en");
    expect(registerSchema.safeParse({ name: "A", email: "x@y.z", password: "abcd1234" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ahmed", email: "x@y.z", password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ahmed", email: "x@y.z", password: "12345678" }).success).toBe(false);
  });

  it("accepts known nationality codes and treats empty as null", () => {
    expect(registerSchema.parse({ name: "Ahmed", email: "a@b.co", password: "abcd1234", nationality: "" }).nationality).toBeNull();
    expect(registerSchema.safeParse({ name: "Ahmed", email: "a@b.co", password: "abcd1234", nationality: "XX" }).success).toBe(false);
  });

  it("requires a different new password", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "abcd1234", newPassword: "abcd1234" }).success).toBe(false);
  });
});

describe("appointment validators", () => {
  it("requires at least one hour of lead time and at most one year", () => {
    const soon = new Date(Date.now() + 30 * 60_000).toISOString();
    const later = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const tooFar = new Date(Date.now() + 400 * 86_400_000).toISOString();
    expect(createAppointmentSchema.safeParse({ facilityId: "f", scheduledAt: soon }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ facilityId: "f", scheduledAt: later }).success).toBe(true);
    expect(createAppointmentSchema.safeParse({ facilityId: "f", scheduledAt: tooFar }).success).toBe(false);
  });

  it("rejects empty staff updates and unknown statuses", () => {
    expect(staffUpdateAppointmentSchema.safeParse({}).success).toBe(false);
    expect(staffUpdateAppointmentSchema.safeParse({ status: "DONE" }).success).toBe(false);
    expect(staffUpdateAppointmentSchema.safeParse({ adminNotes: "" }).success).toBe(true);
  });
});

describe("booking validators", () => {
  it("validates stay dates", () => {
    const base = { hotelId: "h", roomTypeId: "r", guests: 2 };
    expect(createBookingSchema.safeParse({ ...base, checkIn: isoDay(1), checkOut: isoDay(3) }).success).toBe(true);
    expect(createBookingSchema.safeParse({ ...base, checkIn: isoDay(-1), checkOut: isoDay(2) }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, checkIn: isoDay(3), checkOut: isoDay(3) }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, checkIn: isoDay(1), checkOut: isoDay(70) }).success).toBe(false);
    expect(availabilityQuerySchema.parse({ checkIn: isoDay(1), checkOut: isoDay(2), rooms: "2" }).rooms).toBe(2);
  });
});

describe("catalog validators", () => {
  it("cleans lists and optional fields", () => {
    const f = facilityInputSchema.parse({
      name: "Clinic",
      specialties: ["Cardiology", "Cardiology", " ENT "],
      accreditations: [],
      email: "",
      website: "",
      latitude: "",
    });
    expect(f.specialties).toEqual(["Cardiology", "ENT"]);
    expect(f.email).toBeNull();
    expect(f.website).toBeNull();
    expect(f.latitude).toBeNull();
    expect(f.city).toBe("Al-Ahsa");
  });

  it("coerces numeric room fields and bounds them", () => {
    expect(roomTypeInputSchema.parse({ name: "Twin", pricePerNight: "250", totalRooms: "4", amenities: [] }).pricePerNight).toBe(250);
    expect(roomTypeInputSchema.safeParse({ name: "Twin", pricePerNight: -1, totalRooms: 4, amenities: [] }).success).toBe(false);
  });

  it("requires exactly one review target", () => {
    expect(reviewInputSchema.safeParse({ rating: 5 }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 5, facilityId: "a", hotelId: "b" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 6, facilityId: "a" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 4, hotelId: "b" }).success).toBe(true);
  });
});

describe("user admin validators", () => {
  it("requires assignments for staff roles", () => {
    const base = { name: "Staff", email: "s@x.co", password: "abcd1234" };
    expect(adminCreateUserSchema.safeParse({ ...base, role: "HOSPITAL_ADMIN" }).success).toBe(false);
    expect(adminCreateUserSchema.safeParse({ ...base, role: "HOSPITAL_ADMIN", facilityId: "f1" }).success).toBe(true);
    expect(adminCreateUserSchema.safeParse({ ...base, role: "HOTEL_MANAGER", hotelId: "" }).success).toBe(false);
    expect(adminUpdateUserSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

describe("common", () => {
  it("defaults and bounds pagination and ranges", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationSchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(analyticsRangeSchema.parse(undefined)).toBe("90d");
    expect(analyticsRangeSchema.safeParse("7d").success).toBe(false);
  });
});
