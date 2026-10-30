/**
 * Role definitions shared by server and client code. Kept free of Prisma
 * imports so it can be bundled into client components and the proxy.
 */
export const ROLES = ["PATIENT", "HOSPITAL_ADMIN", "HOTEL_MANAGER", "SUPER_ADMIN"] as const;
export type AppRole = (typeof ROLES)[number];

export function isRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Landing page for each role after sign-in (locale prefix is added by the router). */
export function homePathForRole(role: AppRole | undefined | null): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "HOSPITAL_ADMIN":
      return "/hospital";
    case "HOTEL_MANAGER":
      return "/hotel";
    default:
      return "/dashboard";
  }
}

/** Route prefixes (without locale) and the roles allowed to open them. */
export const PROTECTED_ROUTES: { prefix: string; roles: readonly AppRole[] }[] = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/hospital", roles: ["HOSPITAL_ADMIN"] },
  { prefix: "/hotel", roles: ["HOTEL_MANAGER"] },
  { prefix: "/dashboard", roles: ROLES },
  { prefix: "/profile", roles: ROLES },
];

/** Matches a path against a prefix on segment boundaries ("/hotel" ≠ "/hotels"). */
export function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function findProtectedRoute(path: string) {
  return PROTECTED_ROUTES.find((r) => matchesPrefix(path, r.prefix));
}
