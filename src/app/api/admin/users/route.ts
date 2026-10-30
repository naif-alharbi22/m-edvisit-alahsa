import { NextResponse } from "next/server";
import { clientIp, parseJson, parseQuery, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { adminCreateUserSchema, userListQuerySchema } from "@/lib/validators/user";
import { createStaffUser, listUsers } from "@/server/services/users";

export const GET = withErrorHandling(async (req) => {
  await requireApiRole("SUPER_ADMIN");
  return NextResponse.json(await listUsers(parseQuery(req, userListQuerySchema)));
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiRole("SUPER_ADMIN");
  const input = await parseJson(req, adminCreateUserSchema);
  return NextResponse.json({ user: await createStaffUser(user.id, input, clientIp(req)) }, { status: 201 });
});
