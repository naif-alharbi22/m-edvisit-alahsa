import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homePathForRole, type AppRole } from "@/lib/roles";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: AppRole;
  locale: string;
  phone: string | null;
  nationality: string | null;
  facilityId: string | null;
  hotelId: string | null;
}

/**
 * Returns the signed-in user, re-read from the database (authoritative for
 * role, assignment and active status). Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      locale: true,
      phone: true,
      nationality: true,
      facilityId: true,
      hotelId: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) return null;
  const { isActive: _isActive, ...rest } = user;
  void _isActive;
  return rest as CurrentUser;
});

// ─── Route handlers (throw → JSON error response) ───────────────────────────

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireApiRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/**
 * Resolves which facility a request may act on: hospital admins are pinned to
 * their own facility, super admins must name one explicitly.
 */
export function resolveFacilityScope(user: CurrentUser, requested?: string | null): string {
  if (user.role === "HOSPITAL_ADMIN") {
    if (!user.facilityId) throw new ForbiddenError("Your account is not assigned to a facility");
    return user.facilityId;
  }
  if (user.role === "SUPER_ADMIN") {
    if (!requested) throw new ForbiddenError("facilityId is required");
    return requested;
  }
  throw new ForbiddenError();
}

export function resolveHotelScope(user: CurrentUser, requested?: string | null): string {
  if (user.role === "HOTEL_MANAGER") {
    if (!user.hotelId) throw new ForbiddenError("Your account is not assigned to a hotel");
    return user.hotelId;
  }
  if (user.role === "SUPER_ADMIN") {
    if (!requested) throw new ForbiddenError("hotelId is required");
    return requested;
  }
  throw new ForbiddenError();
}

// ─── Server components (redirect) ───────────────────────────────────────────

async function localePrefix() {
  return `/${await getLocale()}`;
}

export async function requirePageUser(callbackPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const prefix = await localePrefix();
    const callback = callbackPath ? `?callbackUrl=${encodeURIComponent(`${prefix}${callbackPath}`)}` : "";
    redirect(`${prefix}/login${callback}`);
  }
  return user;
}

export async function requirePageRole(roles: AppRole[], callbackPath?: string): Promise<CurrentUser> {
  const user = await requirePageUser(callbackPath);
  if (!roles.includes(user.role)) {
    redirect(`${await localePrefix()}${homePathForRole(user.role)}`);
  }
  return user;
}

/** Like resolveFacilityScope, but super admins may omit the facility (= all facilities). */
export function optionalFacilityScope(user: CurrentUser, requested?: string | null): string | undefined {
  if (user.role === "SUPER_ADMIN") return requested || undefined;
  return resolveFacilityScope(user, requested);
}

/** Like resolveHotelScope, but super admins may omit the hotel (= all hotels). */
export function optionalHotelScope(user: CurrentUser, requested?: string | null): string | undefined {
  if (user.role === "SUPER_ADMIN") return requested || undefined;
  return resolveHotelScope(user, requested);
}
