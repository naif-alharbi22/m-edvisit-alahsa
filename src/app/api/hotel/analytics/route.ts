import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveHotelScope } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getHotelAnalytics } from "@/server/analytics/hotel";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOTEL_MANAGER", "SUPER_ADMIN");
  const params = new URL(req.url).searchParams;
  const hotelId = resolveHotelScope(user, params.get("hotelId"));
  const range = analyticsRangeSchema.parse(params.get("range") ?? undefined);
  return NextResponse.json(await getHotelAnalytics(hotelId, range));
});
