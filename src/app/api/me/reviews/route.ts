import { NextResponse } from "next/server";
import { parseJson, withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { reviewInputSchema } from "@/lib/validators/catalog";
import { submitReview } from "@/server/services/reviews";

export const POST = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  const input = await parseJson(req, reviewInputSchema);
  return NextResponse.json({ review: await submitReview(user.id, input) }, { status: 201 });
});
