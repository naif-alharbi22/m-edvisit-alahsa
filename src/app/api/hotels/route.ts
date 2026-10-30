import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { listPublicHotels } from "@/server/services/hotels";

export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const minStars = Number(searchParams.get("minStars"));
  const result = await listPublicHotels({
    nearFacilityId: searchParams.get("facility") || null,
    minStars: Number.isInteger(minStars) && minStars >= 1 && minStars <= 5 ? minStars : null,
    accessible: searchParams.get("accessible") === "1",
    search: searchParams.get("search")?.slice(0, 100) || null,
  });
  return NextResponse.json(result);
});
