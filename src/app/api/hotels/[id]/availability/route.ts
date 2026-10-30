import { NextResponse } from "next/server";
import { parseQuery, withErrorHandling } from "@/lib/api";
import { availabilityQuerySchema } from "@/lib/validators/booking";
import { getHotelAvailability } from "@/server/services/bookings";

export const GET = withErrorHandling<RouteContext<"/api/hotels/[id]/availability">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const query = parseQuery(req, availabilityQuerySchema);
  const availability = await getHotelAvailability(id, query.checkIn, query.checkOut, query.rooms);
  return NextResponse.json(availability, { headers: { "Cache-Control": "no-store" } });
});
