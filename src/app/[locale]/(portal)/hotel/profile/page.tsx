import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { HotelProfileForm } from "@/components/staff/profile-form";
import { requirePageRole } from "@/lib/session";
import { getHotel } from "@/server/services/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hotelPortal");
  return { title: t("profileTitle") };
}

export default async function HotelProfilePage() {
  const user = await requirePageRole(["HOTEL_MANAGER"], "/hotel/profile");
  const [t, hotel] = await Promise.all([getTranslations("hotelPortal"), getHotel(user.hotelId!)]);
  return (
    <>
      <PageHeader title={t("profileTitle")} description={t("profileSubtitle")} />
      <HotelProfileForm hotel={hotel} />
    </>
  );
}
