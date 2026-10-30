import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      facilityId: string | null;
      hotelId: string | null;
      locale: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
    facilityId?: string | null;
    hotelId?: string | null;
    locale?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    facilityId?: string | null;
    hotelId?: string | null;
    locale?: string;
    refreshedAt?: number;
  }
}
