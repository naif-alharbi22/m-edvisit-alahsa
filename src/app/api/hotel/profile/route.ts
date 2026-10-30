import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveHotelScope } from "@/lib/session";
import { hotelProfileSchema } from "@/lib/validators/catalog";
import { getHotel, updateHotel } from "@/server/services/hotels";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  return NextResponse.json({ hotel: await getHotel(hotelId) });
});

export const PATCH = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  const input = await parseJson(req, hotelProfileSchema);
  return NextResponse.json({ hotel: await updateHotel(user.id, hotelId, input) });
});
