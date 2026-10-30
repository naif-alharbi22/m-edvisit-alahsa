import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { hotelInputSchema } from "@/lib/validators/catalog";
import { deleteHotel, updateHotel } from "@/server/services/hotels";

type Ctx = RouteContext<"/api/admin/hotels/[id]">;

export const PATCH = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const { id } = await ctx.params;
  const input = await parseJson(req, hotelInputSchema);
  return NextResponse.json({ hotel: await updateHotel(user.id, id, input) });
});

export const DELETE = withErrorHandling<Ctx>(async (_req, ctx) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const { id } = await ctx.params;
  await deleteHotel(user.id, id);
  return new NextResponse(null, { status: 204 });
});
