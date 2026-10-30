import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { HotelInput, RoomTypeInput } from "@/lib/validators/catalog";
import { ConflictError, NotFoundError } from "@/server/errors";
import { distanceKm } from "@/lib/geo";
import { recordAudit } from "./audit";
import { uniqueSlug } from "./facilities";

// ─── Public catalog ─────────────────────────────────────────────────────────

export interface HotelFilters {
  nearFacilityId?: string | null;
  minStars?: number | null;
  accessible?: boolean;
  search?: string | null;
}

export async function listPublicHotels(filters: HotelFilters = {}) {
  const where: Prisma.HotelWhereInput = { isActive: true };
  if (filters.minStars) where.starRating = { gte: filters.minStars };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { nameAr: { contains: filters.search, mode: "insensitive" } },
      { address: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.accessible) where.roomTypes = { some: { accessible: true, isActive: true } };

  const [hotels, facility] = await Promise.all([
    prisma.hotel.findMany({
      where,
      include: { roomTypes: { where: { isActive: true }, orderBy: { pricePerNight: "asc" } } },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
    }),
    filters.nearFacilityId
      ? prisma.facility.findUnique({
          where: { id: filters.nearFacilityId },
          select: { id: true, name: true, nameAr: true, latitude: true, longitude: true },
        })
      : null,
  ]);

  const withMeta = hotels.map((h) => ({
    ...h,
    minPrice: h.roomTypes.length ? Math.min(...h.roomTypes.map((r) => r.pricePerNight)) : null,
    distanceKm: facility ? distanceKm(h, facility) : null,
  }));

  if (facility) {
    withMeta.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return { hotels: withMeta, facility };
}

export async function getPublicHotelBySlug(slug: string) {
  return prisma.hotel.findFirst({
    where: { slug, isActive: true },
    include: {
      roomTypes: { where: { isActive: true }, orderBy: { pricePerNight: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true, nationality: true } } },
      },
    },
  });
}

/** Hotels sorted by distance from a facility (for "stay nearby" suggestions). */
export async function hotelsNearFacility(facility: { latitude: number | null; longitude: number | null }, limit = 3) {
  const hotels = await prisma.hotel.findMany({
    where: { isActive: true },
    include: { roomTypes: { where: { isActive: true }, select: { pricePerNight: true } } },
  });
  return hotels
    .map((h) => ({
      id: h.id,
      slug: h.slug,
      name: h.name,
      nameAr: h.nameAr,
      starRating: h.starRating,
      rating: h.rating,
      distanceKm: distanceKm(h, facility),
      minPrice: h.roomTypes.length ? Math.min(...h.roomTypes.map((r) => r.pricePerNight)) : null,
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, limit);
}

// ─── Administration ─────────────────────────────────────────────────────────

export async function listHotelsAdmin(query: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.HotelWhereInput = query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { nameAr: { contains: query.q, mode: "insensitive" } },
          { city: { contains: query.q, mode: "insensitive" } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.hotel.findMany({
      where,
      include: {
        roomTypes: { select: { totalRooms: true, isActive: true } },
        _count: { select: { bookings: true, staff: true } },
      },
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.hotel.count({ where }),
  ]);
  return {
    items: items.map(({ roomTypes, ...h }) => ({
      ...h,
      totalRooms: roomTypes.filter((r) => r.isActive).reduce((s, r) => s + r.totalRooms, 0),
      roomTypeCount: roomTypes.length,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function listHotelOptions() {
  return prisma.hotel.findMany({ select: { id: true, name: true, nameAr: true }, orderBy: { name: "asc" } });
}

export async function getHotel(id: string) {
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) throw new NotFoundError("Hotel");
  return hotel;
}

function hotelData(input: Omit<HotelInput, "isActive"> & { isActive?: boolean }) {
  return {
    name: input.name,
    nameAr: input.nameAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    city: input.city,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    website: input.website ?? null,
    image: input.image ?? null,
    starRating: input.starRating,
    amenities: input.amenities,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    checkInTime: input.checkInTime,
    checkOutTime: input.checkOutTime,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

export async function createHotel(actorId: string, input: HotelInput) {
  const hotel = await prisma.hotel.create({ data: { ...hotelData(input), slug: await uniqueSlug("hotel", input.name) } });
  await recordAudit({ actorId, action: "hotel.create", entityType: "Hotel", entityId: hotel.id, metadata: { name: hotel.name } });
  return hotel;
}

export async function updateHotel(actorId: string, id: string, input: Omit<HotelInput, "isActive"> & { isActive?: boolean }) {
  await getHotel(id);
  const hotel = await prisma.hotel.update({ where: { id }, data: hotelData(input) });
  await recordAudit({ actorId, action: "hotel.update", entityType: "Hotel", entityId: id });
  return hotel;
}

export async function deleteHotel(actorId: string, id: string) {
  const hotel = await prisma.hotel.findUnique({ where: { id }, include: { _count: { select: { bookings: true } } } });
  if (!hotel) throw new NotFoundError("Hotel");
  if (hotel._count.bookings > 0) {
    throw new ConflictError("This hotel has booking history. Deactivate it instead of deleting.");
  }
  await prisma.hotel.delete({ where: { id } });
  await recordAudit({ actorId, action: "hotel.delete", entityType: "Hotel", entityId: id, metadata: { name: hotel.name } });
}

// ─── Room types ─────────────────────────────────────────────────────────────

export async function listRoomTypes(hotelId: string) {
  return prisma.roomType.findMany({
    where: { hotelId },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ isActive: "desc" }, { pricePerNight: "asc" }],
  });
}

function roomData(input: RoomTypeInput) {
  return {
    name: input.name,
    nameAr: input.nameAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    capacity: input.capacity,
    bedType: input.bedType ?? null,
    sizeSqm: input.sizeSqm ?? null,
    pricePerNight: input.pricePerNight,
    currency: input.currency,
    totalRooms: input.totalRooms,
    amenities: input.amenities,
    accessible: input.accessible,
    isActive: input.isActive,
  };
}

export async function createRoomType(actorId: string, hotelId: string, input: RoomTypeInput) {
  await getHotel(hotelId);
  const room = await prisma.roomType.create({ data: { ...roomData(input), hotelId } });
  await recordAudit({ actorId, action: "room_type.create", entityType: "RoomType", entityId: room.id, metadata: { hotelId } });
  return room;
}

async function getScopedRoom(hotelId: string, id: string) {
  const room = await prisma.roomType.findFirst({ where: { id, hotelId } });
  if (!room) throw new NotFoundError("Room type");
  return room;
}

export async function updateRoomType(actorId: string, hotelId: string, id: string, input: RoomTypeInput) {
  await getScopedRoom(hotelId, id);
  const room = await prisma.roomType.update({ where: { id }, data: roomData(input) });
  await recordAudit({ actorId, action: "room_type.update", entityType: "RoomType", entityId: id });
  return room;
}

export async function deleteRoomType(actorId: string, hotelId: string, id: string) {
  await getScopedRoom(hotelId, id);
  const used = await prisma.hotelBooking.count({ where: { roomTypeId: id } });
  if (used > 0) {
    await prisma.roomType.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ actorId, action: "room_type.deactivate", entityType: "RoomType", entityId: id });
    return { deleted: false, deactivated: true };
  }
  await prisma.roomType.delete({ where: { id } });
  await recordAudit({ actorId, action: "room_type.delete", entityType: "RoomType", entityId: id });
  return { deleted: true, deactivated: false };
}
