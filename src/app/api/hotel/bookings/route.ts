import { NextResponse } from "next/server";
import { parseQuery, withErrorHandling } from "@/lib/api";
import { optionalHotelScope, requireApiRole } from "@/lib/session";
import { bookingListQuerySchema } from "@/lib/validators/booking";
import { listBookingsForStaff } from "@/server/services/bookings";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const query = parseQuery(req, bookingListQuerySchema);
  const scope = optionalHotelScope(user, query.hotelId);
  return NextResponse.json(await listBookingsForStaff(scope, query));
});
