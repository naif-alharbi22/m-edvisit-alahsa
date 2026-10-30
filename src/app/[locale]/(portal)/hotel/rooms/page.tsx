import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { RoomsManager } from "@/components/staff/catalog-managers";
import { requirePageRole } from "@/lib/session";
import { listRoomTypes } from "@/server/services/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hotelPortal");
  return { title: t("roomsTitle") };
}

export default async function HotelRoomsPage() {
  const user = await requirePageRole(["HOTEL_MANAGER"], "/hotel/rooms");
  const [t, rooms] = await Promise.all([getTranslations("hotelPortal"), listRoomTypes(user.hotelId!)]);
  return (
    <>
      <PageHeader title={t("roomsTitle")} description={t("roomsSubtitle")} />
      <RoomsManager rows={rooms} />
    </>
  );
}
