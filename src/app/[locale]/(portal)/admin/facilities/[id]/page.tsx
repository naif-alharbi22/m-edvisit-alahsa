import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/portal/page-header";
import { AnalyticsFrame } from "@/components/portal/range-select";
import { FacilityAnalyticsView } from "@/components/staff/facility-analytics-view";
import { FacilityProfileForm } from "@/components/staff/profile-form";
import { DoctorsManager, PackagesManager } from "@/components/staff/catalog-managers";
import { requirePageRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getFacilityAnalytics } from "@/server/analytics/facility";
import { listDoctors, listPackages } from "@/server/services/facilities";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const facility = await prisma.facility.findUnique({ where: { id }, select: { name: true } });
  return { title: facility?.name ?? "Facility" };
}

export default async function AdminFacilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/facilities");
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) notFound();
  const range = analyticsRangeSchema.catch("90d").parse(rawRange);
  const [t, th, locale, analytics, doctors, packages] = await Promise.all([
    getTranslations("admin"),
    getTranslations("hospital"),
    getLocale(),
    getFacilityAnalytics(id, range),
    listDoctors(id),
    listPackages(id),
  ]);
  const name = locale === "ar" && facility.nameAr ? facility.nameAr : facility.name;
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ms-2">
        <Link href="/admin/facilities">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("facilitiesTitle")}
        </Link>
      </Button>
      <PageHeader title={name} description={t("facilityDetailSubtitle")} />
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{th("nav.overview")}</TabsTrigger>
          <TabsTrigger value="profile">{th("nav.profile")}</TabsTrigger>
          <TabsTrigger value="doctors">{th("nav.doctors")}</TabsTrigger>
          <TabsTrigger value="packages">{th("nav.packages")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AnalyticsFrame range={range}>
            <FacilityAnalyticsView data={analytics} />
          </AnalyticsFrame>
        </TabsContent>
        <TabsContent value="profile">
          <FacilityProfileForm facility={facility} adminFacilityId={id} />
        </TabsContent>
        <TabsContent value="doctors">
          <DoctorsManager rows={doctors} facilityId={id} />
        </TabsContent>
        <TabsContent value="packages">
          <PackagesManager rows={packages} facilityId={id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
