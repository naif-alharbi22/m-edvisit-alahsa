import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { patientCancelSchema } from "@/lib/validators/appointment";
import { cancelPatientBooking } from "@/server/services/bookings";

export const POST = withErrorHandling<RouteContext<"/api/me/bookings/[id]/cancel">>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { reason } = await parseJson(req, patientCancelSchema);
  return NextResponse.json({ booking: await cancelPatientBooking(user.id, id, reason) });
});
