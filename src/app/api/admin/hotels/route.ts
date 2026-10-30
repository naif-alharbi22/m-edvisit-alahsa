import { NextResponse } from "next/server";
import { parseJson, parseQuery, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { hotelInputSchema } from "@/lib/validators/catalog";
import { listQuerySchema } from "@/lib/validators/common";
import { createHotel, listHotelsAdmin } from "@/server/services/hotels";

export const GET = withErrorHandling(async (req) => {
  await requireApiRole("SUPER_ADMIN");
  return NextResponse.json(await listHotelsAdmin(parseQuery(req, listQuerySchema)));
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const input = await parseJson(req, hotelInputSchema);
  return NextResponse.json({ hotel: await createHotel(user.id, input) }, { status: 201 });
});
