import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveFacilityScope } from "@/lib/session";
import { packageInputSchema } from "@/lib/validators/catalog";
import { createPackage, listPackages } from "@/server/services/facilities";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  return NextResponse.json({ packages: await listPackages(facilityId) });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  const input = await parseJson(req, packageInputSchema);
  return NextResponse.json({ package: await createPackage(user.id, facilityId, input) }, { status: 201 });
});
