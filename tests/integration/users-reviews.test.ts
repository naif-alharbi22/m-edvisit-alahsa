import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { changePassword, createStaffUser, registerPatient, updateUserByAdmin } from "@/server/services/users";
import { submitReview } from "@/server/services/reviews";
import { createFacility, createHotel, createRoomType, createUser, PASSWORD } from "./factories";

describe("users", () => {
  it("registers patients with hashed passwords and a welcome notification", async () => {
    const user = await registerPatient({ name: "Sara Ali", email: "sara@test.local", password: "abcd1234", locale: "ar", nationality: "QA" });
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record.role).toBe("PATIENT");
    expect(await bcrypt.compare("abcd1234", record.password!)).toBe(true);
    expect(await prisma.notification.count({ where: { userId: user.id, kind: "welcome" } })).toBe(1);
    await expect(registerPatient({ name: "Dup", email: "sara@test.local", password: "abcd1234", locale: "en" })).rejects.toMatchObject({ status: 409 });
  });

  it("changes passwords only with the current password", async () => {
    const user = await createUser("PATIENT");
    await expect(changePassword(user.id, "wrong-pass1", "newpass123")).rejects.toMatchObject({ status: 400 });
    await changePassword(user.id, PASSWORD, "newpass123");
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("newpass123", record.password!)).toBe(true);
  });

  it("lets admins create and reassign staff, clearing stale assignments", async () => {
    const admin = await createUser("SUPER_ADMIN");
    const facility = await createFacility();
    const hotel = await createHotel();
    const staff = await createStaffUser(admin.id, {
      name: "Hospital Staff",
      email: "staff@test.local",
      password: "abcd1234",
      role: "HOSPITAL_ADMIN",
      facilityId: facility.id,
      hotelId: hotel.id,
    });
    expect(staff.facilityId).toBe(facility.id);
    expect(staff.hotelId).toBeNull();

    const moved = await updateUserByAdmin(admin.id, staff.id, { role: "HOTEL_MANAGER", hotelId: hotel.id });
    expect(moved).toMatchObject({ role: "HOTEL_MANAGER", hotelId: hotel.id, facilityId: null });

    await expect(updateUserByAdmin(admin.id, staff.id, { role: "HOSPITAL_ADMIN" })).rejects.toMatchObject({ status: 400 });
    await expect(updateUserByAdmin(admin.id, staff.id, { role: "HOSPITAL_ADMIN", facilityId: "missing" })).rejects.toMatchObject({ status: 400 });
    expect(await prisma.auditLog.count({ where: { entityId: staff.id } })).toBeGreaterThanOrEqual(2);
  });

  it("prevents admins from locking themselves out", async () => {
    const admin = await createUser("SUPER_ADMIN");
    await expect(updateUserByAdmin(admin.id, admin.id, { isActive: false })).rejects.toMatchObject({ status: 403 });
    await expect(updateUserByAdmin(admin.id, admin.id, { role: "PATIENT" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("reviews", () => {
  it("requires a completed visit and recomputes the facility rating", async () => {
    const facility = await createFacility();
    const a = await createUser("PATIENT");
    const b = await createUser("PATIENT");
    await expect(submitReview(a.id, { facilityId: facility.id, rating: 5 })).rejects.toMatchObject({ status: 403 });
    for (const u of [a, b]) {
      await prisma.appointment.create({
        data: { reference: `AP-R${u.id.slice(-5).toUpperCase()}`, userId: u.id, facilityId: facility.id, specialty: "Cardiology", scheduledAt: new Date(Date.now() - 86_400_000), status: "COMPLETED" },
      });
    }
    await submitReview(a.id, { facilityId: facility.id, rating: 5, comment: "Great" });
    await submitReview(b.id, { facilityId: facility.id, rating: 3 });
    // Re-reviewing updates instead of duplicating.
    await submitReview(b.id, { facilityId: facility.id, rating: 4 });
    const updated = await prisma.facility.findUniqueOrThrow({ where: { id: facility.id } });
    expect(updated.reviewCount).toBe(2);
    expect(updated.rating).toBe(4.5);
  });

  it("requires a finished stay to review a hotel", async () => {
    const hotel = await createHotel();
    const room = await createRoomType(hotel.id);
    const guest = await createUser("PATIENT");
    await expect(submitReview(guest.id, { hotelId: hotel.id, rating: 4 })).rejects.toMatchObject({ status: 403 });
    await prisma.hotelBooking.create({
      data: {
        reference: "HB-REVIEW",
        userId: guest.id,
        hotelId: hotel.id,
        roomTypeId: room.id,
        checkIn: new Date("2026-01-01T00:00:00Z"),
        checkOut: new Date("2026-01-03T00:00:00Z"),
        nightlyRate: 100,
        totalPrice: 200,
        status: "CHECKED_OUT",
      },
    });
    await submitReview(guest.id, { hotelId: hotel.id, rating: 4 });
    expect((await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } })).rating).toBe(4);
  });
});
