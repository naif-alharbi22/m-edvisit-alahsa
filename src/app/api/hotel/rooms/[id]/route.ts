import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveHotelScope } from "@/lib/session";
import { roomTypeInputSchema } from "@/lib/validators/catalog";
import { deleteRoomType, updateRoomType } from "@/server/services/hotels";

type Ctx = RouteContext<"/api/hotel/rooms/[id]">;

export const PATCH = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  const { id } = await ctx.params;
  const input = await parseJson(req, roomTypeInputSchema);
  return NextResponse.json({ roomType: await updateRoomType(user.id, hotelId, id, input) });
});

export const DELETE = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const hotelId = resolveHotelScope(user, new URL(req.url).searchParams.get("hotelId"));
  const { id } = await ctx.params;
  return NextResponse.json(await deleteRoomType(user.id, hotelId, id));
});
