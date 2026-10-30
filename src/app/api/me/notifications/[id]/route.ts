import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { markNotificationRead } from "@/server/services/notifications";

export const PATCH = withErrorHandling<RouteContext<"/api/me/notifications/[id]">>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await markNotificationRead(user.id, id);
  return NextResponse.json({ ok: true });
});
