import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/portal/page-header";
import { AnalyticsFrame } from "@/components/portal/range-select";
import { HotelAnalyticsView } from "@/components/staff/hotel-analytics-view";
import { HotelProfileForm } from "@/components/staff/profile-form";
import { RoomsManager } from "@/components/staff/catalog-managers";
import { requirePageRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { analyticsRangeSchema } from "@/lib/validators/common";
import { getHotelAnalytics } from "@/server/analytics/hotel";
import { listRoomTypes } from "@/server/services/hotels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({ where: { id }, select: { name: true } });
  return { title: hotel?.name ?? "Hotel" };
}

export default async function AdminHotelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/hotels");
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();
  const range = analyticsRangeSchema.catch("30d").parse(rawRange ?? "30d");
  const [t, th, locale, analytics, rooms] = await Promise.all([
    getTranslations("admin"),
    getTranslations("hotelPortal"),
    getLocale(),
    getHotelAnalytics(id, range),
    listRoomTypes(id),
  ]);
  const name = locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name;
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ms-2">
        <Link href="/admin/hotels">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("hotelsTitle")}
        </Link>
      </Button>
      <PageHeader title={name} description={t("hotelDetailSubtitle")} />
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{th("nav.overview")}</TabsTrigger>
          <TabsTrigger value="profile">{th("nav.profile")}</TabsTrigger>
          <TabsTrigger value="rooms">{th("nav.rooms")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AnalyticsFrame range={range}>
            <HotelAnalyticsView data={analytics} />
          </AnalyticsFrame>
        </TabsContent>
        <TabsContent value="profile">
          <HotelProfileForm hotel={hotel} adminHotelId={id} />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsManager rows={rooms} hotelId={id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
