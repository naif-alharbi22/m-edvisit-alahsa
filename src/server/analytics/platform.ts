import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AnalyticsRange } from "@/lib/validators/common";
import { REVENUE_BOOKING_STATUSES } from "@/lib/status";
import { computeOccupancy, fillSeries, occupancySeries, percentChange, rate, round2, topWithOther } from "./compute";
import { timeSeries } from "./queries";
import { instantToDateOnly, localToday, resolveRange } from "./time";

export async function getPlatformAnalytics(rangeKey: AnalyticsRange, now = new Date()) {
  const range = resolveRange(rangeKey, now);
  const tomorrow = localToday(now).end;
  const occEnd = range.end > tomorrow ? tomorrow : range.end;
  const window = { gte: range.start, lt: range.end };
  const prevWindow = { gte: range.prevStart, lt: range.prevEnd };

  const [
    totalPatients,
    newPatients,
    newPatientsPrev,
    apptStatus,
    apptStatusPrev,
    medicalRevenue,
    medicalRevenuePrev,
    reportsBySpecialty,
    reportsByUrgency,
    nationalities,
    facilities,
    facilityStats,
    hotels,
    stays,
    hotelBookingsNow,
    hotelBookingsPrev,
    registrationsSeries,
    appointmentsSeries,
    medicalRevenueSeries,
    ratingAgg,
    funnelRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PATIENT", createdAt: window } }),
    prisma.user.count({ where: { role: "PATIENT", createdAt: prevWindow } }),
    prisma.appointment.groupBy({ by: ["status"], where: { scheduledAt: window }, _count: true }),
    prisma.appointment.groupBy({ by: ["status"], where: { scheduledAt: prevWindow }, _count: true }),
    prisma.appointment.aggregate({ where: { scheduledAt: window, status: "COMPLETED" }, _sum: { price: true } }),
    prisma.appointment.aggregate({ where: { scheduledAt: prevWindow, status: "COMPLETED" }, _sum: { price: true } }),
    prisma.medicalReport.groupBy({ by: ["specialty"], where: { createdAt: window, specialty: { not: null } }, _count: true }),
    prisma.medicalReport.groupBy({ by: ["urgency"], where: { createdAt: window, urgency: { not: null } }, _count: true }),
    prisma.user.groupBy({ by: ["nationality"], where: { role: "PATIENT" }, _count: true }),
    prisma.facility.findMany({ select: { id: true, name: true, nameAr: true, rating: true, isActive: true } }),
    prisma.appointment.groupBy({
      by: ["facilityId", "status"],
      where: { scheduledAt: window },
      _count: true,
      _sum: { price: true },
    }),
    prisma.hotel.findMany({
      select: {
        id: true,
        name: true,
        nameAr: true,
        rating: true,
        isActive: true,
        roomTypes: { where: { isActive: true }, select: { totalRooms: true } },
      },
    }),
    prisma.hotelBooking.findMany({
      where: {
        status: { in: REVENUE_BOOKING_STATUSES },
        checkIn: { lt: instantToDateOnly(range.end) },
        checkOut: { gt: instantToDateOnly(range.prevStart) },
      },
      select: { hotelId: true, checkIn: true, checkOut: true, rooms: true, nightlyRate: true },
    }),
    prisma.hotelBooking.groupBy({
      by: ["hotelId"],
      where: { createdAt: window, status: { not: "CANCELLED" } },
      _count: true,
    }),
    prisma.hotelBooking.count({ where: { createdAt: prevWindow, status: { not: "CANCELLED" } } }),
    timeSeries({ table: "User", dateColumn: "createdAt", range, where: Prisma.sql`role = 'PATIENT'` }),
    timeSeries({ table: "Appointment", dateColumn: "scheduledAt", range, where: Prisma.sql`status <> 'CANCELLED'` }),
    timeSeries({
      table: "Appointment",
      dateColumn: "scheduledAt",
      range,
      valueSql: "COALESCE(SUM(price), 0)",
      where: Prisma.sql`status = 'COMPLETED'`,
    }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    // Cohort funnel: patients who registered in the window.
    prisma.$queryRaw<{ registered: number; triaged: number; booked: number; completed: number; stayed: number }[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS registered,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "MedicalReport" r WHERE r."userId" = u.id))::int AS triaged,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Appointment" a WHERE a."userId" = u.id))::int AS booked,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Appointment" a WHERE a."userId" = u.id AND a.status = 'COMPLETED'))::int AS completed,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "HotelBooking" b WHERE b."userId" = u.id AND b.status <> 'CANCELLED'))::int AS stayed
      FROM "User" u
      WHERE u.role = 'PATIENT' AND u."createdAt" >= ${range.start} AND u."createdAt" < ${range.end}
    `),
  ]);

  const count = (rows: { status: string; _count: number }[], s?: string) =>
    rows.filter((r) => !s || r.status === s).reduce((sum, r) => sum + r._count, 0);
  const activeAppointments = count(apptStatus) - count(apptStatus, "CANCELLED");
  const activeAppointmentsPrev = count(apptStatusPrev) - count(apptStatusPrev, "CANCELLED");
  const completed = count(apptStatus, "COMPLETED");
  const resolved = completed + count(apptStatus, "NO_SHOW") + count(apptStatus, "CANCELLED");
  const completedPrev = count(apptStatusPrev, "COMPLETED");
  const resolvedPrev = completedPrev + count(apptStatusPrev, "NO_SHOW") + count(apptStatusPrev, "CANCELLED");

  // Hotel revenue and occupancy are accrued per night.
  const inventory = hotels.reduce((s, h) => s + h.roomTypes.reduce((a, r) => a + r.totalRooms, 0), 0);
  const hotelNow = computeOccupancy(inventory, stays, range.start, occEnd);
  const hotelPrev = computeOccupancy(inventory, stays, range.prevStart, range.prevEnd);
  const hotelRevenueSeries = occupancySeries(inventory, stays, range.buckets, tomorrow);

  const medRev = round2(medicalRevenue._sum.price ?? 0);
  const medRevPrev = round2(medicalRevenuePrev._sum.price ?? 0);
  const totalRevenue = round2(medRev + hotelNow.revenue);
  const totalRevenuePrev = round2(medRevPrev + hotelPrev.revenue);

  const hotelBookingTotal = hotelBookingsNow.reduce((s, h) => s + h._count, 0);

  const registrations = fillSeries(range.buckets, registrationsSeries);
  const appointments = fillSeries(range.buckets, appointmentsSeries);
  const medicalRevenueFilled = fillSeries(range.buckets, medicalRevenueSeries);

  const facilityMap = new Map<string, { appointments: number; completed: number; resolved: number; revenue: number }>();
  for (const row of facilityStats) {
    const e = facilityMap.get(row.facilityId) ?? { appointments: 0, completed: 0, resolved: 0, revenue: 0 };
    if (row.status !== "CANCELLED") e.appointments += row._count;
    if (row.status === "COMPLETED") {
      e.completed += row._count;
      e.revenue += row._sum.price ?? 0;
    }
    if (["COMPLETED", "NO_SHOW", "CANCELLED"].includes(row.status)) e.resolved += row._count;
    facilityMap.set(row.facilityId, e);
  }

  const hotelBookingMap = new Map(hotelBookingsNow.map((h) => [h.hotelId, h._count]));
  const funnel = funnelRaw[0] ?? { registered: 0, triaged: 0, booked: 0, completed: 0, stayed: 0 };

  return {
    range: rangeKey,
    granularity: range.granularity,
    kpis: {
      totalPatients: { value: totalPatients },
      newPatients: { value: newPatients, change: percentChange(newPatients, newPatientsPrev) },
      appointments: { value: activeAppointments, change: percentChange(activeAppointments, activeAppointmentsPrev) },
      completionRate: {
        value: rate(completed, resolved),
        change: percentChange(rate(completed, resolved), rate(completedPrev, resolvedPrev)),
      },
      hotelBookings: { value: hotelBookingTotal, change: percentChange(hotelBookingTotal, hotelBookingsPrev) },
      occupancy: { value: hotelNow.occupancy, change: percentChange(hotelNow.occupancy, hotelPrev.occupancy) },
      revenue: { value: totalRevenue, change: percentChange(totalRevenue, totalRevenuePrev) },
      medicalRevenue: { value: medRev },
      hotelRevenue: { value: hotelNow.revenue },
      avgRating: { value: round2(ratingAgg._avg.rating ?? 0), reviews: ratingAgg._count },
    },
    series: range.buckets.map((b, i) => ({
      key: b.key,
      registrations: registrations[i]!.value,
      appointments: appointments[i]!.value,
      medicalRevenue: round2(medicalRevenueFilled[i]!.value),
      hotelRevenue: hotelRevenueSeries[i]!.revenue,
    })),
    appointmentsByStatus: apptStatus.map((s) => ({ status: s.status, value: s._count })),
    triageBySpecialty: topWithOther(
      reportsBySpecialty.map((r) => ({ label: r.specialty ?? "__unknown__", value: r._count })),
      7
    ),
    urgencyMix: reportsByUrgency.map((r) => ({ urgency: r.urgency!, value: r._count })),
    nationalities: topWithOther(
      nationalities.map((n) => ({ label: n.nationality ?? "__unknown__", value: n._count })),
      8
    ),
    funnel: [
      { stage: "registered", value: funnel.registered },
      { stage: "triaged", value: funnel.triaged },
      { stage: "booked", value: funnel.booked },
      { stage: "completed", value: funnel.completed },
      { stage: "stayed", value: funnel.stayed },
    ],
    facilityLeaderboard: facilities
      .map((f) => {
        const s = facilityMap.get(f.id) ?? { appointments: 0, completed: 0, resolved: 0, revenue: 0 };
        return {
          id: f.id,
          name: f.name,
          nameAr: f.nameAr,
          rating: f.rating,
          isActive: f.isActive,
          appointments: s.appointments,
          completionRate: rate(s.completed, s.resolved),
          revenue: round2(s.revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue),
    hotelLeaderboard: hotels
      .map((h) => {
        const rooms = h.roomTypes.reduce((s, r) => s + r.totalRooms, 0);
        const r = computeOccupancy(
          rooms,
          stays.filter((s) => s.hotelId === h.id),
          range.start,
          occEnd
        );
        return {
          id: h.id,
          name: h.name,
          nameAr: h.nameAr,
          rating: h.rating,
          isActive: h.isActive,
          bookings: hotelBookingMap.get(h.id) ?? 0,
          occupancy: r.occupancy,
          revenue: r.revenue,
          adr: r.adr,
        };
      })
      .sort((a, b) => b.revenue - a.revenue),
  };
}

export type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalytics>>;
