import { prisma } from "@/lib/prisma";
import type { ReviewInput } from "@/lib/validators/catalog";
import { ForbiddenError, NotFoundError } from "@/server/errors";

async function refreshFacilityRating(facilityId: string) {
  const agg = await prisma.review.aggregate({ where: { facilityId }, _avg: { rating: true }, _count: true });
  await prisma.facility.update({
    where: { id: facilityId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  });
}

async function refreshHotelRating(hotelId: string) {
  const agg = await prisma.review.aggregate({ where: { hotelId }, _avg: { rating: true }, _count: true });
  await prisma.hotel.update({
    where: { id: hotelId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  });
}

/** Patients may review a facility after a completed visit, or a hotel after checkout. */
export async function submitReview(userId: string, input: ReviewInput) {
  if (input.facilityId) {
    const facility = await prisma.facility.count({ where: { id: input.facilityId } });
    if (!facility) throw new NotFoundError("Facility");
    const eligible = await prisma.appointment.count({
      where: { userId, facilityId: input.facilityId, status: "COMPLETED" },
    });
    if (!eligible) throw new ForbiddenError("You can review a facility after a completed visit");
    const review = await prisma.review.upsert({
      where: { userId_facilityId: { userId, facilityId: input.facilityId } },
      create: { userId, facilityId: input.facilityId, rating: input.rating, comment: input.comment ?? null },
      update: { rating: input.rating, comment: input.comment ?? null },
    });
    await refreshFacilityRating(input.facilityId);
    return review;
  }

  const hotelId = input.hotelId!;
  const hotel = await prisma.hotel.count({ where: { id: hotelId } });
  if (!hotel) throw new NotFoundError("Hotel");
  const eligible = await prisma.hotelBooking.count({ where: { userId, hotelId, status: "CHECKED_OUT" } });
  if (!eligible) throw new ForbiddenError("You can review a hotel after your stay");
  const review = await prisma.review.upsert({
    where: { userId_hotelId: { userId, hotelId } },
    create: { userId, hotelId, rating: input.rating, comment: input.comment ?? null },
    update: { rating: input.rating, comment: input.comment ?? null },
  });
  await refreshHotelRating(hotelId);
  return review;
}

/** IDs of facilities and hotels the user has already reviewed. */
export async function getReviewedTargets(userId: string) {
  const reviews = await prisma.review.findMany({ where: { userId }, select: { facilityId: true, hotelId: true, rating: true } });
  return {
    facilities: new Map(reviews.filter((r) => r.facilityId).map((r) => [r.facilityId!, r.rating])),
    hotels: new Map(reviews.filter((r) => r.hotelId).map((r) => [r.hotelId!, r.rating])),
  };
}
