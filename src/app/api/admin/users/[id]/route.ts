import { NextResponse } from "next/server";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { adminUpdateUserSchema } from "@/lib/validators/user";
import { updateUserByAdmin } from "@/server/services/users";

export const PATCH = withErrorHandling<RouteContext<"/api/admin/users/[id]">>(async (req, ctx) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const { id } = await ctx.params;
  const input = await parseJson(req, adminUpdateUserSchema);
  return NextResponse.json({ user: await updateUserByAdmin(user.id, id, input, clientIp(req)) });
});
