import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/session";
import { homePathForRole } from "@/lib/roles";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle"), robots: { index: false } };
}

const DEMO_ACCOUNTS = [
  { role: "SUPER_ADMIN", email: "admin@medvisit.sa" },
  { role: "HOSPITAL_ADMIN", email: "admin.almoosa@medvisit.sa" },
  { role: "HOTEL_MANAGER", email: "manager.grand@medvisit.sa" },
  { role: "PATIENT", email: "patient@medvisit.sa" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(safeCallbackUrl(callbackUrl) ?? `/${await getLocale()}${homePathForRole(user.role)}`);
  }
  const demoMode = process.env.DEMO_MODE === "true";
  return (
    <LoginForm
      callbackUrl={callbackUrl ?? null}
      initialError={error ?? null}
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
      demoAccounts={demoMode ? DEMO_ACCOUNTS : null}
      demoPassword={demoMode ? process.env.SEED_PASSWORD || "MedVisit@2026" : null}
    />
  );
}
