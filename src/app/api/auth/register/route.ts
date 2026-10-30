import { NextResponse } from "next/server";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators/auth";
import { registerPatient } from "@/server/services/users";

export const POST = withErrorHandling(async (req) => {
  enforceRateLimit("register", clientIp(req));
  const input = await parseJson(req, registerSchema);
  const user = await registerPatient(input);
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
});
