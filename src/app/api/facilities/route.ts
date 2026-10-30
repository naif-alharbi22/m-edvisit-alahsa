import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { listPublicFacilities, listSpecialties } from "@/server/services/facilities";

export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const search = searchParams.get("search")?.slice(0, 100);
  const [facilities, specialties] = await Promise.all([
    listPublicFacilities({ specialty: specialty && specialty !== "all" ? specialty : null, search }),
    listSpecialties(),
  ]);
  return NextResponse.json({ facilities, specialties });
});
