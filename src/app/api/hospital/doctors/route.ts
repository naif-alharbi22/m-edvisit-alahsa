import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole, resolveFacilityScope } from "@/lib/session";
import { doctorInputSchema } from "@/lib/validators/catalog";
import { createDoctor, listDoctors } from "@/server/services/facilities";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  return NextResponse.json({ doctors: await listDoctors(facilityId) });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const facilityId = resolveFacilityScope(user, new URL(req.url).searchParams.get("facilityId"));
  const input = await parseJson(req, doctorInputSchema);
  return NextResponse.json({ doctor: await createDoctor(user.id, facilityId, input) }, { status: 201 });
});
