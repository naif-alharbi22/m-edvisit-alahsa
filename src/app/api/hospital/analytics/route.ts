import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveFacilityScope } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getFacilityAnalytics } from "@/server/analytics/facility";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const params = new URL(req.url).searchParams;
  const facilityId = resolveFacilityScope(user, params.get("facilityId"));
  const range = analyticsRangeSchema.parse(params.get("range") ?? undefined);
  return NextResponse.json(await getFacilityAnalytics(facilityId, range));
});
