import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFacilityAnalytics } from "@/server/analytics/facility";
import { getHotelAnalytics } from "@/server/analytics/hotel";
import { getPlatformAnalytics } from "@/server/analytics/platform";
import { createDoctor, createFacility, createHotel, createRoomType, createUser } from "./factories";

/** Fixed "now" so the expectations are exact: Friday 2026-10-30 12:00 Riyadh. */
const NOW = new Date("2026-10-30T09:00:00Z");
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const at = (s: string) => new Date(`${s}T07:00:00.000Z`); // 10:00 Riyadh

let facilityId: string;
let hotelId: string;

beforeAll(async () => {
  const facility = await createFacility();
  facilityId = facility.id;
  const doctor = await createDoctor(facility.id, "Cardiology", 500);
  const kw = await createUser("PATIENT", { nationality: "KW" });
  const ae = await createUser("PATIENT", { nationality: "AE" });

  let n = 0;
  const appt = (userId: string, date: string, status: "COMPLETED" | "CANCELLED" | "NO_SHOW" | "CONFIRMED" | "PENDING", price: number) =>
    prisma.appointment.create({
      data: { reference: `AP-AN${String(n++).padStart(4, "0")}`, userId, facilityId, doctorId: doctor.id, specialty: "Cardiology", scheduledAt: at(date), status, price },
    });

  // Inside the 30-day window (Oct 1 – Oct 30).
  await appt(kw.id, "2026-10-05", "COMPLETED", 500);
  await appt(kw.id, "2026-10-12", "COMPLETED", 1500);
  await appt(ae.id, "2026-10-20", "NO_SHOW", 500);
  await appt(ae.id, "2026-10-25", "CANCELLED", 500);
  // Previous 30-day window (Sep 1 – Sep 30).
  await appt(kw.id, "2026-09-15", "COMPLETED", 1000);
  // Upcoming.
  await prisma.appointment.create({
    data: { reference: "AP-AN-UP", userId: ae.id, facilityId, specialty: "Cardiology", scheduledAt: new Date("2026-11-02T07:00:00Z"), status: "PENDING", price: 500 },
  });

  const hotel = await createHotel();
  hotelId = hotel.id;
  const room = await createRoomType(hotel.id, 2, 400); // inventory: 2 rooms
  let b = 0;
  const booking = (checkIn: string, checkOut: string, status: "CHECKED_OUT" | "CHECKED_IN" | "CANCELLED" | "CONFIRMED", rooms = 1) =>
    prisma.hotelBooking.create({
      data: {
        reference: `HB-AN${String(b++).padStart(4, "0")}`,
        userId: kw.id,
        hotelId,
        roomTypeId: room.id,
        checkIn: day(checkIn),
        checkOut: day(checkOut),
        rooms,
        nightlyRate: 400,
        totalPrice: 0,
        status,
        createdAt: at("2026-10-01"),
      },
    });
  await booking("2026-10-10", "2026-10-15", "CHECKED_OUT"); // 5 nights
  await booking("2026-10-28", "2026-11-02", "CHECKED_IN"); // 3 nights inside the window (28, 29, 30)
  await booking("2026-10-20", "2026-10-22", "CANCELLED"); // ignored for revenue
  await booking("2026-09-25", "2026-10-02", "CHECKED_OUT"); // 1 night in window (Oct 1), 6 in previous
});

describe("facility analytics", () => {
  it("computes KPIs for the window and compares to the previous period", async () => {
    const a = await getFacilityAnalytics(facilityId, "30d", NOW);
    expect(a.kpis.appointments.value).toBe(3); // cancelled visits are excluded
    expect(a.kpis.appointments.change).toBe(2); // 3 vs 1
    expect(a.kpis.revenue.value).toBe(2000);
    expect(a.kpis.revenue.change).toBe(1); // 2000 vs 1000
    expect(a.kpis.completionRate.value).toBe(0.5); // 2 of 4 resolved
    expect(a.kpis.noShowRate.value).toBe(0.25);
    expect(a.kpis.uniquePatients.value).toBe(2);
    expect(a.kpis.pendingRequests.value).toBe(1);
    expect(a.kpis.avgVisitValue.value).toBe(1000);
  });

  it("buckets the series by local day and breaks down by doctor and nationality", async () => {
    const a = await getFacilityAnalytics(facilityId, "30d", NOW);
    expect(a.series).toHaveLength(30);
    expect(a.series.find((s) => s.key === "2026-10-12")).toMatchObject({ completed: 1, other: 0, revenue: 1500 });
    expect(a.series.find((s) => s.key === "2026-10-20")).toMatchObject({ completed: 0, other: 1 });
    expect(a.series.find((s) => s.key === "2026-10-25")).toMatchObject({ completed: 0, other: 0 });
    expect(a.byStatus.find((s) => s.status === "CANCELLED")?.value).toBe(1);
    expect(a.byDoctor[0]).toMatchObject({ appointments: 3, completed: 2, revenue: 2000 });
    expect(a.byNationality.map((n) => n.label).sort()).toEqual(["AE", "KW"]);
    expect(a.upcoming.map((u) => u.reference)).toEqual(["AP-AN-UP"]);
  });
});

describe("hotel analytics", () => {
  it("measures occupancy, ADR and RevPAR on room-nights up to tonight", async () => {
    const h = await getHotelAnalytics(hotelId, "30d", NOW);
    // Window: Oct 1 – Oct 30 = 30 nights × 2 rooms = 60 available room-nights.
    // Sold: 5 (Oct 10-14) + 3 (Oct 28-30) + 1 (Oct 1) = 9.
    expect(h.inventory).toBe(2);
    expect(h.kpis.occupancy.value).toBe(0.15);
    expect(h.kpis.revenue.value).toBe(3600);
    expect(h.kpis.adr.value).toBe(400);
    expect(h.kpis.revpar.value).toBe(60);
    expect(h.operations.inHouseBookings).toBe(1);
    expect(h.series.find((s) => s.key === "2026-10-12")).toMatchObject({ occupancy: 0.5, revenue: 400 });
  });

  it("reports cancellation rate and stay length for arrivals in the window", async () => {
    const h = await getHotelAnalytics(hotelId, "30d", NOW);
    // Arrivals in window: Oct 10, Oct 28, Oct 20 (cancelled).
    expect(h.kpis.bookings.value).toBe(2);
    expect(h.kpis.cancellationRate.value).toBe(0.3333);
    expect(h.kpis.avgStay.value).toBe(5);
  });
});

describe("platform analytics", () => {
  it("aggregates across partners and builds the funnel", async () => {
    const p = await getPlatformAnalytics("12m", NOW);
    expect(p.kpis.totalPatients.value).toBeGreaterThanOrEqual(2);
    expect(p.kpis.medicalRevenue.value).toBeGreaterThanOrEqual(3000);
    // 4 non-cancelled visits in the 12-month window (the Nov 2 visit falls after it).
    expect(p.facilityLeaderboard.find((f) => f.id === facilityId)).toMatchObject({ appointments: 4, revenue: 3000 });
    expect(p.hotelLeaderboard.find((h) => h.id === hotelId)!.revenue).toBeGreaterThan(0);
    expect(p.funnel.map((f) => f.stage)).toEqual(["registered", "triaged", "booked", "completed", "stayed"]);
    expect(p.series).toHaveLength(12);
  });
});
