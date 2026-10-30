import { NextResponse } from "next/server";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validators/auth";
import { changePassword } from "@/server/services/users";

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  enforceRateLimit("auth", `${clientIp(req)}:pwd:${user.id}`);
  const input = await parseJson(req, changePasswordSchema);
  await changePassword(user.id, input.currentPassword, input.newPassword);
  return NextResponse.json({ ok: true });
});
