import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { AnalyticsFrame } from "@/components/portal/range-select";
import { PlatformAnalyticsView } from "@/components/staff/platform-analytics-view";
import { requirePageRole } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getPlatformAnalytics } from "@/server/analytics/platform";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("overviewTitle") };
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin");
  const { range: rawRange } = await searchParams;
  const range = analyticsRangeSchema.catch("90d").parse(rawRange);
  const [t, data] = await Promise.all([getTranslations("admin"), getPlatformAnalytics(range)]);
  return (
    <>
      <PageHeader title={t("overviewTitle")} description={t("overviewSubtitle")} />
      <AnalyticsFrame range={range}>
        <PlatformAnalyticsView data={data} />
      </AnalyticsFrame>
    </>
  );
}
