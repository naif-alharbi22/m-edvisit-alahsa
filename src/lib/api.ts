import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, BadRequestError, ForbiddenError, TooManyRequestsError } from "@/server/errors";
import { logger } from "@/lib/logger";

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

function prismaErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    const code = (err as { code: string }).code;
    return /^P\d{4}$/.test(code) ? code : undefined;
  }
  return undefined;
}

/** Converts any thrown value into a JSON error response. */
export function errorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    );
  }

  if (err instanceof AppError) {
    const res = NextResponse.json<ApiErrorBody>(
      { error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) },
      { status: err.status }
    );
    if (err instanceof TooManyRequestsError) {
      res.headers.set("Retry-After", String(err.retryAfterSeconds));
    }
    return res;
  }

  const prismaCode = prismaErrorCode(err);
  if (prismaCode === "P2002") {
    return NextResponse.json({ error: "A record with these details already exists", code: "CONFLICT" }, { status: 409 });
  }
  if (prismaCode === "P2025") {
    return NextResponse.json({ error: "Resource not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (prismaCode === "P2003") {
    return NextResponse.json(
      { error: "This record is referenced by other data and cannot be changed", code: "CONFLICT" },
      { status: 409 }
    );
  }

  logger.error("Unhandled API error", { err });
  return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Defense in depth against cross-site request forgery (session cookies are
 * already SameSite=Lax): browsers send an Origin header on state-changing
 * requests, and it must match this deployment. Requests without an Origin
 * (server-to-server, CLI) are allowed.
 */
export function assertSameOrigin(req: Request) {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const originHost = hostOf(origin);
  const allowed = new Set(
    [
      req.headers.get("x-forwarded-host"),
      req.headers.get("host"),
      hostOf(process.env.APP_URL),
      hostOf(process.env.NEXTAUTH_URL),
    ].filter((h): h is string => Boolean(h))
  );
  if (!originHost || !allowed.has(originHost)) {
    throw new ForbiddenError("Cross-origin request rejected");
  }
}

/** Wraps a route handler with uniform error handling and an origin check. */
export function withErrorHandling<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Parses and validates a JSON request body. */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
  return schema.parse(body);
}

/** Validates URL search params against a schema (values are strings or undefined). */
export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

/** Best-effort client IP (expects a trusted reverse proxy to set X-Forwarded-For). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
