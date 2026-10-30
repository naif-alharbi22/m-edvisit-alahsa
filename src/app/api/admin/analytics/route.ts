import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getPlatformAnalytics } from "@/server/analytics/platform";

export const GET = withErrorHandling(async (req) => {
  await requireApiRole("SUPER_ADMIN");
  const range = analyticsRangeSchema.parse(new URL(req.url).searchParams.get("range") ?? undefined);
  return NextResponse.json(await getPlatformAnalytics(range));
});
