import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { AnalyticsFrame } from "@/components/portal/range-select";
import { HotelAnalyticsView } from "@/components/staff/hotel-analytics-view";
import { requirePageRole } from "@/lib/session";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getHotelAnalytics } from "@/server/analytics/hotel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hotelPortal");
  return { title: t("overviewTitle") };
}

export default async function HotelOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requirePageRole(["HOTEL_MANAGER"], "/hotel");
  const { range: rawRange } = await searchParams;
  const range = analyticsRangeSchema.catch("30d").parse(rawRange ?? "30d");
  const [t, locale, data] = await Promise.all([getTranslations("hotelPortal"), getLocale(), getHotelAnalytics(user.hotelId!, range)]);
  const name = data.hotel ? (locale === "ar" && data.hotel.nameAr ? data.hotel.nameAr : data.hotel.name) : "";
  return (
    <>
      <PageHeader title={t("overviewTitle")} description={t("overviewSubtitle", { hotel: name })} />
      <AnalyticsFrame range={range}>
        <HotelAnalyticsView data={data} />
      </AnalyticsFrame>
    </>
  );
}
