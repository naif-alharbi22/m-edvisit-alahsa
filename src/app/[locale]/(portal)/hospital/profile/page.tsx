import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { FacilityProfileForm } from "@/components/staff/profile-form";
import { requirePageRole } from "@/lib/session";
import { getFacility } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hospital");
  return { title: t("profileTitle") };
}

export default async function HospitalProfilePage() {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital/profile");
  const [t, facility] = await Promise.all([getTranslations("hospital"), getFacility(user.facilityId!)]);
  return (
    <>
      <PageHeader title={t("profileTitle")} description={t("profileSubtitle")} />
      <FacilityProfileForm facility={facility} />
    </>
  );
}
