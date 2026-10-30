import { NextResponse } from "next/server";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { optionalFacilityScope, requireApiRole } from "@/lib/session";
import { staffUpdateAppointmentSchema } from "@/lib/validators/appointment";
import { updateAppointmentByStaff } from "@/server/services/appointments";

export const PATCH = withErrorHandling<RouteContext<"/api/hospital/appointments/[id]">>(async (req, ctx) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const { id } = await ctx.params;
  const input = await parseJson(req, staffUpdateAppointmentSchema);
  const scope = optionalFacilityScope(user, null);
  const appointment = await updateAppointmentByStaff(user.id, scope, id, input, clientIp(req));
  return NextResponse.json({ appointment });
});
