import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { facilityInputSchema } from "@/lib/validators/catalog";
import { deleteFacility, updateFacility } from "@/server/services/facilities";

type Ctx = RouteContext<"/api/admin/facilities/[id]">;

export const PATCH = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const { id } = await ctx.params;
  const input = await parseJson(req, facilityInputSchema);
  return NextResponse.json({ facility: await updateFacility(user.id, id, input) });
});

export const DELETE = withErrorHandling<Ctx>(async (_req, ctx) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const { id } = await ctx.params;
  await deleteFacility(user.id, id);
  return new NextResponse(null, { status: 204 });
});
