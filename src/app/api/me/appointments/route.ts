import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { createAppointment, listPatientAppointments } from "@/server/services/appointments";

export const GET = withErrorHandling(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ appointments: await listPatientAppointments(user.id) });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  enforceRateLimit("booking", user.id);
  const input = await parseJson(req, createAppointmentSchema);
  const appointment = await createAppointment(user.id, input);
  return NextResponse.json({ appointment }, { status: 201 });
});
