import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import { createBookingSchema } from "@/lib/validators/booking";
import { createBooking, listPatientBookings } from "@/server/services/bookings";

export const GET = withErrorHandling(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ bookings: await listPatientBookings(user.id) });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  enforceRateLimit("booking", user.id);
  const input = await parseJson(req, createBookingSchema);
  const booking = await createBooking(user.id, input);
  return NextResponse.json({ booking }, { status: 201 });
});
