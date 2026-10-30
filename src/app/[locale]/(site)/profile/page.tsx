import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileForms } from "@/components/profile/profile-forms";
import { requirePageUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requirePageUser("/profile");
  const [t, record] = await Promise.all([
    getTranslations("profile"),
    prisma.user.findUnique({ where: { id: user.id }, select: { password: true } }),
  ]);
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ProfileForms
        user={{ name: user.name, email: user.email, phone: user.phone, nationality: user.nationality, locale: user.locale }}
        hasPassword={Boolean(record?.password)}
      />
    </div>
  );
}
