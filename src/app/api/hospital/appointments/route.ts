import { NextResponse } from "next/server";
import { parseQuery, withErrorHandling } from "@/lib/api";
import { optionalFacilityScope, requireApiRole } from "@/lib/session";
import { appointmentListQuerySchema } from "@/lib/validators/appointment";
import { listAppointmentsForStaff } from "@/server/services/appointments";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const query = parseQuery(req, appointmentListQuerySchema);
  const scope = optionalFacilityScope(user, query.facilityId);
  return NextResponse.json(await listAppointmentsForStaff(scope, query));
});
