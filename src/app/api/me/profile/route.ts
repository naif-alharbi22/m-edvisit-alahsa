import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { profileSchema } from "@/lib/validators/auth";
import { updateProfile } from "@/server/services/users";

export const GET = withErrorHandling(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ user });
});

export const PATCH = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  const input = await parseJson(req, profileSchema);
  return NextResponse.json({ user: await updateProfile(user.id, input) });
});
