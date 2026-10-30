import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/session";
import { homePathForRole } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/${await getLocale()}${homePathForRole(user.role)}`);
  return <RegisterForm googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
