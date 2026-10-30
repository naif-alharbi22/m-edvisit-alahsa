import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveFacilityScope } from "@/lib/session";
import { packageInputSchema } from "@/lib/validators/catalog";
import { deletePackage, updatePackage } from "@/server/services/facilities";

type Ctx = RouteContext<"/api/hospital/packages/[id]">;

export const PATCH = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  const { id } = await ctx.params;
  const input = await parseJson(req, packageInputSchema);
  return NextResponse.json({ package: await updatePackage(user.id, facilityId, id, input) });
});

export const DELETE = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  const { id } = await ctx.params;
  return NextResponse.json(await deletePackage(user.id, facilityId, id));
});
