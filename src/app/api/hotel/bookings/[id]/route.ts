import { NextResponse } from "next/server";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { optionalHotelScope, requireApiRole } from "@/lib/session";
import { managerUpdateBookingSchema } from "@/lib/validators/booking";
import { updateBookingByStaff } from "@/server/services/bookings";

export const PATCH = withErrorHandling<RouteContext<"/api/hotel/bookings/[id]">>(async (req, ctx) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const { id } = await ctx.params;
  const input = await parseJson(req, managerUpdateBookingSchema);
  const booking = await updateBookingByStaff(user.id, optionalHotelScope(user, null), id, input, clientIp(req));
  return NextResponse.json({ booking });
});
