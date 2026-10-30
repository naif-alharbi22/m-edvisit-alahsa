import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AnalyticsRange } from "@/lib/validators/common";
import { REVENUE_BOOKING_STATUSES } from "@/lib/status";
import { computeOccupancy, fillSeries, occupancySeries, percentChange, rate, round2 } from "./compute";
import { timeSeries } from "./queries";
import { instantToDateOnly, localDateOnly, localToday, resolveRange } from "./time";

const DAY = 86_400_000;

export async function getHotelAnalytics(hotelId: string, rangeKey: AnalyticsRange, now = new Date()) {
  const range = resolveRange(rangeKey, now);
  const tomorrow = localToday(now).end;
  // Occupancy is measured on nights up to and including tonight.
  const occEnd = range.end > tomorrow ? tomorrow : range.end;
  const startDate = instantToDateOnly(range.prevStart);
  const endDate = instantToDateOnly(range.end);
  const today = localDateOnly(now);

  const [hotel, roomTypes, stays, checkInsNow, checkInsPrev, bookingSeries, arrivalsToday, departuresToday, inHouse, upcomingArrivals] =
    await Promise.all([
      prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true, nameAr: true, rating: true, reviewCount: true } }),
      prisma.roomType.findMany({
        where: { hotelId },
        select: { id: true, name: true, nameAr: true, totalRooms: true, isActive: true, pricePerNight: true },
      }),
      // Stays overlapping the current or previous window that generate revenue.
      prisma.hotelBooking.findMany({
        where: {
          hotelId,
          status: { in: REVENUE_BOOKING_STATUSES },
          checkIn: { lt: endDate },
          checkOut: { gt: startDate },
        },
        select: { roomTypeId: true, checkIn: true, checkOut: true, rooms: true, nightlyRate: true },
      }),
      prisma.hotelBooking.findMany({
        where: { hotelId, checkIn: { gte: instantToDateOnly(range.start), lt: endDate } },
        select: { status: true, checkIn: true, checkOut: true, appointmentId: true },
      }),
      prisma.hotelBooking.findMany({
        where: { hotelId, checkIn: { gte: startDate, lt: instantToDateOnly(range.start) } },
        select: { status: true },
      }),
      timeSeries({
        table: "HotelBooking",
        dateColumn: "createdAt",
        range,
        where: Prisma.sql`"hotelId" = ${hotelId} AND status <> 'CANCELLED'`,
      }),
      prisma.hotelBooking.count({ where: { hotelId, checkIn: today, status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.hotelBooking.count({ where: { hotelId, checkOut: today, status: "CHECKED_IN" } }),
      prisma.hotelBooking.aggregate({ where: { hotelId, status: "CHECKED_IN" }, _sum: { guests: true, rooms: true }, _count: true }),
      prisma.hotelBooking.findMany({
        where: {
          hotelId,
          status: { in: ["PENDING", "CONFIRMED"] },
          checkIn: { gte: today, lt: new Date(today.getTime() + 7 * DAY) },
        },
        include: { user: { select: { name: true, nationality: true } }, roomType: { select: { name: true, nameAr: true } } },
        orderBy: { checkIn: "asc" },
        take: 8,
      }),
    ]);

  const inventory = roomTypes.filter((r) => r.isActive).reduce((s, r) => s + r.totalRooms, 0);
  const current = computeOccupancy(inventory, stays, range.start, occEnd);
  const previous = computeOccupancy(inventory, stays, range.prevStart, range.prevEnd);

  const active = checkInsNow.filter((b) => b.status !== "CANCELLED");
  const cancelledNow = checkInsNow.length - active.length;
  const activePrev = checkInsPrev.filter((b) => b.status !== "CANCELLED").length;
  const totalNights = active.reduce((s, b) => s + Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / DAY), 0);
  const medicalLinked = active.filter((b) => b.appointmentId).length;

  const occSeries = occupancySeries(inventory, stays, range.buckets, tomorrow);
  const bookings = fillSeries(range.buckets, bookingSeries);

  const roomPerformance = roomTypes
    .map((rt) => {
      const r = computeOccupancy(
        rt.isActive ? rt.totalRooms : 0,
        stays.filter((s) => s.roomTypeId === rt.id),
        range.start,
        occEnd
      );
      return {
        id: rt.id,
        name: rt.name,
        nameAr: rt.nameAr,
        rooms: rt.totalRooms,
        isActive: rt.isActive,
        soldRoomNights: r.soldRoomNights,
        occupancy: r.occupancy,
        revenue: r.revenue,
        adr: r.adr,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    range: rangeKey,
    granularity: range.granularity,
    hotel,
    inventory,
    kpis: {
      occupancy: { value: current.occupancy, change: percentChange(current.occupancy, previous.occupancy) },
      adr: { value: current.adr, change: percentChange(current.adr, previous.adr) },
      revpar: { value: current.revpar, change: percentChange(current.revpar, previous.revpar) },
      revenue: { value: current.revenue, change: percentChange(current.revenue, previous.revenue) },
      bookings: { value: active.length, change: percentChange(active.length, activePrev) },
      cancellationRate: { value: rate(cancelledNow, checkInsNow.length) },
      avgStay: { value: active.length ? round2(totalNights / active.length) : 0 },
      medicalLinked: { value: rate(medicalLinked, active.length) },
      rating: { value: hotel?.rating ?? 0, reviews: hotel?.reviewCount ?? 0 },
    },
    operations: {
      arrivalsToday,
      departuresToday,
      inHouseBookings: inHouse._count,
      inHouseGuests: inHouse._sum.guests ?? 0,
      roomsOccupied: inHouse._sum.rooms ?? 0,
    },
    series: range.buckets.map((b, i) => ({
      key: b.key,
      occupancy: occSeries[i]!.occupancy,
      soldRoomNights: occSeries[i]!.soldRoomNights,
      revenue: occSeries[i]!.revenue,
      bookings: bookings[i]!.value,
    })),
    roomPerformance,
    upcomingArrivals: upcomingArrivals.map((b) => ({
      id: b.id,
      reference: b.reference,
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
      status: b.status,
      guest: b.user.name,
      nationality: b.user.nationality,
      room: b.roomType.name,
      roomAr: b.roomType.nameAr,
      rooms: b.rooms,
      guests: b.guests,
    })),
  };
}

export type HotelAnalytics = Awaited<ReturnType<typeof getHotelAnalytics>>;
