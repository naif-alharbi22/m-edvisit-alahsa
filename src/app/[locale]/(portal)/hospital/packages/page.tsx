import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { PackagesManager } from "@/components/staff/catalog-managers";
import { requirePageRole } from "@/lib/session";
import { listPackages } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hospital");
  return { title: t("packagesTitle") };
}

export default async function HospitalPackagesPage() {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital/packages");
  const [t, packages] = await Promise.all([getTranslations("hospital"), listPackages(user.facilityId!)]);
  return (
    <>
      <PageHeader title={t("packagesTitle")} description={t("packagesSubtitle")} />
      <PackagesManager rows={packages} />
    </>
  );
}
