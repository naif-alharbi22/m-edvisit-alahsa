import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";
import { findProtectedRoute, homePathForRole, isRole } from "@/lib/roles";

const intlMiddleware = createMiddleware(routing);

/**
 * 1. Coarse, cookie-only authorization for portal routes (fast redirect to
 *    login / the user's home). Every page and route handler still verifies the
 *    user against the database — this is a UX layer, not the security boundary.
 * 2. Locale negotiation and prefixing via next-intl.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  const hasLocale = (routing.locales as readonly string[]).includes(maybeLocale ?? "");
  const locale = hasLocale ? maybeLocale! : routing.defaultLocale;
  const pathWithoutLocale = hasLocale ? `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/" : pathname;

  const rule = findProtectedRoute(pathWithoutLocale);
  if (rule) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", `/${locale}${pathWithoutLocale}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    const role = isRole(token.role) ? token.role : "PATIENT";
    if (!rule.roles.includes(role)) {
      return NextResponse.redirect(new URL(`/${locale}${homePathForRole(role)}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
