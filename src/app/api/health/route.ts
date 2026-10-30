import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

/**
 * Liveness: GET /api/health?probe=live (process is up).
 * Readiness: GET /api/health (process is up and the database answers).
 */
export async function GET(req: NextRequest) {
  const base = {
    service: "medvisit",
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "unknown",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
  if (req.nextUrl.searchParams.get("probe") === "live") {
    return NextResponse.json({ status: "ok", ...base });
  }
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database timeout")), 3000)),
    ]);
    return NextResponse.json({ status: "ok", database: "ok", ...base }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable", ...base },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
