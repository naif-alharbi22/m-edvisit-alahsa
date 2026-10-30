import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { AnalyticsFrame } from "@/components/portal/range-select";
import { FacilityAnalyticsView } from "@/components/staff/facility-analytics-view";
import { requirePageRole } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getFacilityAnalytics } from "@/server/analytics/facility";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hospital");
  return { title: t("overviewTitle") };
}

export default async function HospitalOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital");
  const { range: rawRange } = await searchParams;
  const range = analyticsRangeSchema.catch("90d").parse(rawRange);
  const [t, locale, data] = await Promise.all([getTranslations("hospital"), getLocale(), getFacilityAnalytics(user.facilityId!, range)]);
  const name = data.facility ? (locale === "ar" && data.facility.nameAr ? data.facility.nameAr : data.facility.name) : "";
  return (
    <>
      <PageHeader title={t("overviewTitle")} description={t("overviewSubtitle", { facility: name })} />
      <AnalyticsFrame range={range}>
        <FacilityAnalyticsView data={data} />
      </AnalyticsFrame>
    </>
  );
}
