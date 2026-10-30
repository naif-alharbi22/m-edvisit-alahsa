import { NextResponse } from "next/server";
import { z } from "zod";
import { parseQuery, withErrorHandling } from "@/lib/api";
import { requireApiRole } from "@/lib/session";
import { listQuerySchema } from "@/lib/validators/common";
import { listAuditLogs } from "@/server/services/audit";

const querySchema = listQuerySchema.extend({ entityType: z.string().max(40).optional() });

export const GET = withErrorHandling(async (req) => {
  await requireApiRole("SUPER_ADMIN");
  return NextResponse.json(await listAuditLogs(parseQuery(req, querySchema)));
});
