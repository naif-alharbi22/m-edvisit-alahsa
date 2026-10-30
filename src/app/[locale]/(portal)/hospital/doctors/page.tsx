import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { DoctorsManager } from "@/components/staff/catalog-managers";
import { requirePageRole } from "@/lib/session";
import { listDoctors } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hospital");
  return { title: t("doctorsTitle") };
}

export default async function HospitalDoctorsPage() {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital/doctors");
  const [t, doctors] = await Promise.all([getTranslations("hospital"), listDoctors(user.facilityId!)]);
  return (
    <>
      <PageHeader title={t("doctorsTitle")} description={t("doctorsSubtitle")} />
      <DoctorsManager rows={doctors} />
    </>
  );
}
