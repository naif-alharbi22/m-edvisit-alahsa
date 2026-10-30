import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelPatientBooking,
  createBooking,
  getHotelAvailability,
  listBookingsForStaff,
  updateBookingByStaff,
} from "@/server/services/bookings";
import { bookingListQuerySchema } from "@/lib/validators/booking";
import { createAppointment } from "@/server/services/appointments";
import { createFacility, createHotel, createRoomType, createUser, futureAt, isoDay } from "./factories";

let hotel: Awaited<ReturnType<typeof createHotel>>;
let room: Awaited<ReturnType<typeof createRoomType>>;
let patient: Awaited<ReturnType<typeof createUser>>;
let manager: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  hotel = await createHotel();
  room = await createRoomType(hotel.id, 2, 500);
  patient = await createUser("PATIENT");
  manager = await createUser("HOTEL_MANAGER", { hotelId: hotel.id });
});

const stay = (checkIn: number, checkOut: number, extra: Record<string, unknown> = {}) => ({
  hotelId: hotel.id,
  roomTypeId: room.id,
  checkIn: isoDay(checkIn),
  checkOut: isoDay(checkOut),
  rooms: 1,
  guests: 1,
  ...extra,
});

describe("availability and pricing", () => {
  it("quotes nights × rate × rooms and reports remaining inventory", async () => {
    const before = await getHotelAvailability(hotel.id, isoDay(5), isoDay(8), 1);
    expect(before.nights).toBe(3);
    const quote = before.roomTypes.find((r) => r.roomTypeId === room.id)!;
    expect(quote).toMatchObject({ available: 2, bookable: true, totalPrice: 1500 });

    const booking = await createBooking(patient.id, stay(5, 8));
    expect(booking.totalPrice).toBe(1500);
    expect(booking.nightlyRate).toBe(500);
    expect(booking.reference).toMatch(/^HB-/);

    const after = await getHotelAvailability(hotel.id, isoDay(6), isoDay(7), 2);
    expect(after.roomTypes.find((r) => r.roomTypeId === room.id)).toMatchObject({ available: 1, bookable: false });
  });

  it("never oversells the last room under concurrent requests", async () => {
    const guests = await Promise.all(Array.from({ length: 6 }, () => createUser("PATIENT")));
    const results = await Promise.allSettled(guests.map((g) => createBooking(g.id, stay(20, 22, { rooms: 1 }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected.every((r) => (r.reason as { status?: number }).status === 409)).toBe(true);
  });

  it("enforces capacity and ownership of linked appointments", async () => {
    await expect(createBooking(patient.id, stay(30, 31, { guests: 5 }))).rejects.toMatchObject({ status: 400 });
    const facility = await createFacility();
    const someoneElse = await createUser("PATIENT");
    const appt = await createAppointment(someoneElse.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(31) });
    await expect(createBooking(patient.id, stay(30, 31, { appointmentId: appt.id }))).rejects.toMatchObject({ status: 400 });
  });

  it("frees inventory when a booking is cancelled", async () => {
    const a = await createBooking(patient.id, stay(40, 42, { rooms: 2 }));
    expect((await getHotelAvailability(hotel.id, isoDay(40), isoDay(41), 1)).roomTypes[0]!.available).toBe(0);
    await cancelPatientBooking(patient.id, a.id);
    expect((await getHotelAvailability(hotel.id, isoDay(40), isoDay(41), 1)).roomTypes[0]!.available).toBe(2);
  });
});

describe("manager workflow", () => {
  it("confirms and blocks early check-in", async () => {
    const b = await createBooking(patient.id, stay(50, 52));
    const confirmed = await updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CONFIRMED" });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(await prisma.notification.count({ where: { userId: patient.id, kind: "bookingConfirmed" } })).toBeGreaterThan(0);
    await expect(updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CHECKED_IN" })).rejects.toMatchObject({ status: 400 });
    await expect(updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CHECKED_OUT" })).rejects.toMatchObject({ status: 400 });
  });

  it("checks guests in on arrival day and out afterwards", async () => {
    const today = new Date(`${isoDay(0)}T00:00:00.000Z`);
    const b = await prisma.hotelBooking.create({
      data: {
        reference: "HB-TODAY1",
        userId: patient.id,
        hotelId: hotel.id,
        roomTypeId: room.id,
        checkIn: today,
        checkOut: new Date(today.getTime() + 2 * 86_400_000),
        nightlyRate: 500,
        totalPrice: 1000,
        status: "CONFIRMED",
      },
    });
    expect((await updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CHECKED_IN" })).checkedInAt).not.toBeNull();
    await expect(updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CANCELLED" })).rejects.toMatchObject({ status: 400 });
    expect((await updateBookingByStaff(manager.id, hotel.id, b.id, { status: "CHECKED_OUT" })).status).toBe("CHECKED_OUT");
  });

  it("scopes managers to their hotel and lists upcoming stays", async () => {
    const otherHotel = await createHotel();
    const b = await createBooking(patient.id, stay(60, 61));
    await expect(updateBookingByStaff(manager.id, otherHotel.id, b.id, { status: "CONFIRMED" })).rejects.toMatchObject({ status: 404 });
    const list = await listBookingsForStaff(hotel.id, bookingListQuerySchema.parse({}));
    expect(list.items.every((i) => i.hotel.id === hotel.id)).toBe(true);
    const checkIns = list.items.map((i) => i.checkIn.getTime());
    expect(checkIns).toEqual([...checkIns].sort((x, y) => x - y));
  });
});
