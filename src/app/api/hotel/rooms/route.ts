import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveHotelScope } from "@/lib/session";
import { roomTypeInputSchema } from "@/lib/validators/catalog";
import { createRoomType, listRoomTypes } from "@/server/services/hotels";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  return NextResponse.json({ roomTypes: await listRoomTypes(hotelId) });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  const input = await parseJson(req, roomTypeInputSchema);
  return NextResponse.json({ roomType: await createRoomType(user.id, hotelId, input) }, { status: 201 });
});
