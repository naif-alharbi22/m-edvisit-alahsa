import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingListQuery, CreateBookingInput, ManagerUpdateBookingInput } from "@/lib/validators/booking";
import {
  INVENTORY_BOOKING_STATUSES,
  canTransitionBooking,
  type BookingStatusValue,
} from "@/lib/status";
import { generateReference } from "@/lib/reference";
import { nightsBetween, parseDateOnly, roundMoney } from "@/lib/utils";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { availableRooms } from "./availability";
import { notify, notifyStaff } from "./notifications";
import { recordAudit } from "./audit";

export const bookingListInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, nationality: true } },
  hotel: { select: { id: true, name: true, nameAr: true, slug: true } },
  roomType: { select: { id: true, name: true, nameAr: true, accessible: true } },
  appointment: {
    select: { id: true, reference: true, scheduledAt: true, facility: { select: { name: true, nameAr: true } } },
  },
} satisfies Prisma.HotelBookingInclude;

export type BookingWithRelations = Prisma.HotelBookingGetPayload<{ include: typeof bookingListInclude }>;

function overlapping(checkIn: Date, checkOut: Date): Prisma.HotelBookingWhereInput {
  return {
    status: { in: INVENTORY_BOOKING_STATUSES },
    checkIn: { lt: checkOut },
    checkOut: { gt: checkIn },
  };
}

// ─── Availability ───────────────────────────────────────────────────────────

export async function getHotelAvailability(hotelId: string, checkInStr: string, checkOutStr: string, rooms: number) {
  const checkIn = parseDateOnly(checkInStr);
  const checkOut = parseDateOnly(checkOutStr);
  const nights = nightsBetween(checkIn, checkOut);

  const roomTypes = await prisma.roomType.findMany({
    where: { hotelId, isActive: true, hotel: { isActive: true } },
    include: {
      bookings: { where: overlapping(checkIn, checkOut), select: { checkIn: true, checkOut: true, rooms: true } },
    },
    orderBy: { pricePerNight: "asc" },
  });

  return {
    nights,
    roomTypes: roomTypes.map(({ bookings, ...rt }) => {
      const available = availableRooms(rt.totalRooms, bookings, checkIn, checkOut);
      return {
        roomTypeId: rt.id,
        available,
        bookable: available >= rooms,
        totalPrice: roundMoney(rt.pricePerNight * nights * rooms),
        currency: rt.currency,
      };
    }),
  };
}

// ─── Patient operations ─────────────────────────────────────────────────────

export async function createBooking(userId: string, input: CreateBookingInput) {
  const checkIn = parseDateOnly(input.checkIn);
  const checkOut = parseDateOnly(input.checkOut);
  const nights = nightsBetween(checkIn, checkOut);

  if (input.appointmentId) {
    const owned = await prisma.appointment.count({ where: { id: input.appointmentId, userId } });
    if (!owned) throw new BadRequestError("Selected appointment was not found");
  }

  const run = () =>
    prisma.$transaction(async (tx) => {
      // Lock the room type row so concurrent bookings for it are serialized.
      await tx.$queryRaw`SELECT id FROM "RoomType" WHERE id = ${input.roomTypeId} FOR UPDATE`;

      const roomType = await tx.roomType.findFirst({
        where: { id: input.roomTypeId, hotelId: input.hotelId, isActive: true, hotel: { isActive: true } },
        include: { hotel: { select: { id: true, name: true } } },
      });
      if (!roomType) throw new NotFoundError("Room type");
      if (input.guests > roomType.capacity * input.rooms) {
        throw new BadRequestError(`This room type sleeps up to ${roomType.capacity} guests per room`);
      }

      const existing = await tx.hotelBooking.findMany({
        where: { roomTypeId: roomType.id, ...overlapping(checkIn, checkOut) },
        select: { checkIn: true, checkOut: true, rooms: true },
      });
      if (availableRooms(roomType.totalRooms, existing, checkIn, checkOut) < input.rooms) {
        throw new ConflictError("Not enough rooms are available for the selected dates");
      }

      return tx.hotelBooking.create({
        data: {
          reference: generateReference("HB"),
          userId,
          hotelId: roomType.hotelId,
          roomTypeId: roomType.id,
          appointmentId: input.appointmentId ?? null,
          checkIn,
          checkOut,
          guests: input.guests,
          rooms: input.rooms,
          nightlyRate: roomType.pricePerNight,
          totalPrice: roundMoney(roomType.pricePerNight * nights * input.rooms),
          currency: roomType.currency,
          specialRequests: input.specialRequests ?? null,
        },
        include: bookingListInclude,
      });
    });

  let booking: BookingWithRelations | undefined;
  for (let attempt = 0; attempt < 5 && !booking; attempt++) {
    try {
      booking = await run();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002" && JSON.stringify((err as { meta?: unknown }).meta ?? "").includes("reference")) continue;
      throw err;
    }
  }
  if (!booking) throw new Error("Could not generate a unique booking reference");

  const checkInIso = input.checkIn;
  await Promise.all([
    notify(userId, "bookingRequested", { reference: booking.reference, hotel: booking.hotel.name, checkIn: checkInIso }, "/dashboard"),
    notifyStaff(
      { hotelId: booking.hotelId },
      "newBookingRequest",
      { reference: booking.reference, patient: booking.user.name ?? booking.user.email, checkIn: checkInIso },
      "/hotel/bookings"
    ),
    recordAudit({ actorId: userId, action: "booking.create", entityType: "HotelBooking", entityId: booking.id }),
  ]);
  return booking;
}

export async function listPatientBookings(userId: string) {
  return prisma.hotelBooking.findMany({
    where: { userId },
    include: bookingListInclude,
    orderBy: { checkIn: "desc" },
  });
}

export async function cancelPatientBooking(userId: string, id: string, reason?: string | null) {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id, userId },
    include: { hotel: { select: { id: true, name: true } }, user: { select: { name: true, email: true } } },
  });
  if (!booking) throw new NotFoundError("Booking");
  if (!canTransitionBooking(booking.status, "CANCELLED")) {
    throw new BadRequestError("This booking can no longer be cancelled");
  }
  const todayUtc = parseDateOnly(new Date().toISOString().slice(0, 10));
  if (booking.checkIn < todayUtc) throw new BadRequestError("Bookings cannot be cancelled after the check-in date");

  const updated = await prisma.hotelBooking.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledReason: reason ?? "Cancelled by guest" },
  });
  await Promise.all([
    notifyStaff(
      { hotelId: booking.hotel.id },
      "bookingCancelledByPatient",
      { reference: booking.reference, patient: booking.user.name ?? booking.user.email },
      "/hotel/bookings"
    ),
    recordAudit({ actorId: userId, action: "booking.cancel", entityType: "HotelBooking", entityId: id }),
  ]);
  return updated;
}

// ─── Hotel staff operations ─────────────────────────────────────────────────

function staffWhere(scopeHotelId: string | undefined, query: BookingListQuery): Prisma.HotelBookingWhereInput {
  const hotelId = scopeHotelId ?? query.hotelId;
  return {
    ...(hotelId ? { hotelId } : {}),
    ...(query.status ? { status: query.status } : {}),
    // Date filters select stays that overlap the requested window.
    ...(query.from ? { checkOut: { gt: parseDateOnly(query.from) } } : {}),
    ...(query.to ? { checkIn: { lte: parseDateOnly(query.to) } } : {}),
    ...(query.q
      ? {
          OR: [
            { reference: { contains: query.q.toUpperCase() } },
            { user: { name: { contains: query.q, mode: "insensitive" } } },
            { user: { email: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listBookingsForStaff(scopeHotelId: string | undefined, query: BookingListQuery) {
  const where = staffWhere(scopeHotelId, query);
  const [items, total, statusCounts] = await Promise.all([
    prisma.hotelBooking.findMany({
      where,
      include: bookingListInclude,
      orderBy: { checkIn: query.status === "PENDING" || query.status === "CONFIRMED" || !query.status ? "asc" : "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.hotelBooking.count({ where }),
    prisma.hotelBooking.groupBy({ by: ["status"], where: staffWhere(scopeHotelId, { ...query, status: undefined }), _count: true }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Partial<Record<BookingStatusValue, number>>;
  return { items, total, page: query.page, pageSize: query.pageSize, counts };
}

export async function exportBookingsForStaff(scopeHotelId: string | undefined, query: BookingListQuery) {
  return prisma.hotelBooking.findMany({
    where: staffWhere(scopeHotelId, query),
    include: bookingListInclude,
    orderBy: { checkIn: "desc" },
    take: 10_000,
  });
}

export async function updateBookingByStaff(
  actorId: string,
  scopeHotelId: string | undefined,
  id: string,
  input: ManagerUpdateBookingInput,
  ipAddress?: string
) {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id, ...(scopeHotelId ? { hotelId: scopeHotelId } : {}) },
    include: { hotel: { select: { name: true } } },
  });
  if (!booking) throw new NotFoundError("Booking");

  const data: Prisma.HotelBookingUpdateInput = {};
  const now = new Date();
  const todayUtc = parseDateOnly(now.toISOString().slice(0, 10));
  let notifyKind: "bookingConfirmed" | "bookingCancelled" | "bookingCheckedOut" | null = null;

  if (input.status && input.status !== booking.status) {
    if (!canTransitionBooking(booking.status, input.status)) {
      throw new BadRequestError(`Cannot change status from ${booking.status} to ${input.status}`);
    }
    data.status = input.status;
    switch (input.status) {
      case "CONFIRMED":
        data.confirmedAt = now;
        notifyKind = "bookingConfirmed";
        break;
      case "CHECKED_IN":
        if (booking.checkIn > todayUtc) throw new BadRequestError("Guests cannot check in before the arrival date");
        data.checkedInAt = now;
        break;
      case "CHECKED_OUT":
        data.checkedOutAt = now;
        notifyKind = "bookingCheckedOut";
        break;
      case "CANCELLED":
        data.cancelledAt = now;
        data.cancelledReason = input.cancelledReason ?? "Cancelled by hotel";
        notifyKind = "bookingCancelled";
        break;
    }
  }
  if (input.managerNotes !== undefined) data.managerNotes = input.managerNotes;

  const updated = await prisma.hotelBooking.update({ where: { id }, data, include: bookingListInclude });

  if (notifyKind) {
    await notify(
      updated.userId,
      notifyKind,
      { reference: updated.reference, hotel: booking.hotel.name, checkIn: updated.checkIn.toISOString().slice(0, 10) },
      "/dashboard"
    );
  }
  await recordAudit({
    actorId,
    action: "booking.update",
    entityType: "HotelBooking",
    entityId: id,
    metadata: { from: booking.status, to: updated.status },
    ipAddress,
  });
  return updated;
}
