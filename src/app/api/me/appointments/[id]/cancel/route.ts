import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { patientCancelSchema } from "@/lib/validators/appointment";
import { cancelPatientAppointment } from "@/server/services/appointments";

export const POST = withErrorHandling<RouteContext<"/api/me/appointments/[id]/cancel">>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { reason } = await parseJson(req, patientCancelSchema);
  return NextResponse.json({ appointment: await cancelPatientAppointment(user.id, id, reason) });
});
