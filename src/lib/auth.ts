import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isRole } from "@/lib/roles";

/** How often (ms) the JWT re-reads role/assignment/active status from the database. */
const TOKEN_REFRESH_INTERVAL = 60_000;

export const AUTH_ERRORS = {
  rateLimited: "RATE_LIMITED",
  disabled: "ACCOUNT_DISABLED",
} as const;

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] : value;
}

async function loadTokenClaims(where: { id: string } | { email: string }) {
  return prisma.user.findUnique({
    where,
    select: { id: true, role: true, facilityId: true, hotelId: true, isActive: true, locale: true, name: true, image: true },
  });
}

function applyClaims(token: JWT, user: NonNullable<Awaited<ReturnType<typeof loadTokenClaims>>>): JWT {
  token.id = user.id;
  token.sub = user.id;
  token.role = isRole(user.role) ? user.role : "PATIENT";
  token.facilityId = user.facilityId;
  token.hotelId = user.hotelId;
  token.locale = user.locale;
  token.name = user.name;
  token.picture = user.image;
  token.refreshedAt = Date.now();
  return token;
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, req) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      if (!email || !password) return null;

      const forwarded = headerValue(req?.headers, "x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      const rateLimitOn = !["0", "false", "no", "off"].includes(String(process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase());
      if (rateLimitOn) {
        const { limit, windowMs } = RATE_LIMITS.auth;
        if (!checkRateLimit(`auth:${ip}:${email}`, limit, windowMs).allowed) {
          throw new Error(AUTH_ERRORS.rateLimited);
        }
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.password) return null;

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return null;
      if (!user.isActive) throw new Error(AUTH_ERRORS.disabled);

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: isRole(user.role) ? user.role : "PATIENT",
        facilityId: user.facilityId,
        hotelId: user.hotelId,
        locale: user.locale,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!email || emailVerified === false) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (!existing.isActive) return `/login?error=${AUTH_ERRORS.disabled}`;
        await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date(), image: existing.image ?? user.image } });
        return true;
      }

      await prisma.user.create({
        data: { email, name: user.name, image: user.image, lastLoginAt: new Date() },
      });
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign-in.
      if (user) {
        // OAuth providers hand us the provider's user id; resolve our own record by email.
        const record =
          account?.provider === "credentials"
            ? await loadTokenClaims({ id: user.id })
            : user.email
              ? await loadTokenClaims({ email: user.email.toLowerCase() })
              : null;
        if (!record) throw new Error("User record not found after sign-in");
        return applyClaims(token, record);
      }

      const stale = !token.refreshedAt || Date.now() - token.refreshedAt > TOKEN_REFRESH_INTERVAL;
      if ((stale || trigger === "update") && token.id) {
        const record = await loadTokenClaims({ id: token.id });
        if (!record || !record.isActive) {
          // Throwing makes next-auth clear the session cookie.
          logger.info("Revoking session for missing or deactivated user", { userId: token.id });
          throw new Error(AUTH_ERRORS.disabled);
        }
        return applyClaims(token, record);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "PATIENT";
        session.user.facilityId = token.facilityId ?? null;
        session.user.hotelId = token.hotelId ?? null;
        session.user.locale = token.locale ?? "en";
        session.user.name = token.name ?? session.user.name;
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      logger.error(`next-auth: ${code}`, { metadata: metadata instanceof Error ? metadata.message : metadata });
    },
    warn(code) {
      logger.warn(`next-auth: ${code}`);
    },
    debug() {},
  },
};
