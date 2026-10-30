import { csvResponse, parseQuery, withErrorHandling } from "@/lib/api";
import { optionalHotelScope, requireApiRole } from "@/lib/session";
import { bookingListQuerySchema } from "@/lib/validators/booking";
import { exportBookingsForStaff } from "@/server/services/bookings";
import { bookingsCsv, exportFilename } from "@/server/exports";
import { recordAudit } from "@/server/services/audit";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const query = parseQuery(req, bookingListQuerySchema);
  const scope = optionalHotelScope(user, query.hotelId);
  const rows = await exportBookingsForStaff(scope, query);
  await recordAudit({ actorId: user.id, action: "booking.export", entityType: "HotelBooking", metadata: { rows: rows.length, hotelId: scope ?? "all" } });
  return csvResponse(bookingsCsv(rows), exportFilename("hotel-bookings"));
});
