import { NextResponse } from "next/server";
import { parseJson, parseQuery, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { facilityInputSchema } from "@/lib/validators/catalog";
import { listQuerySchema } from "@/lib/validators/common";
import { createFacility, listFacilitiesAdmin } from "@/server/services/facilities";

export const GET = withErrorHandling(async (req) => {
  await requireApiRole("SUPER_ADMIN");
  return NextResponse.json(await listFacilitiesAdmin(parseQuery(req, listQuerySchema)));
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const input = await parseJson(req, facilityInputSchema);
  return NextResponse.json({ facility: await createFacility(user.id, input) }, { status: 201 });
});
