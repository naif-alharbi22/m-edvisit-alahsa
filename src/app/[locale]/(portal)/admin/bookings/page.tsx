import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { Pagination } from "@/components/portal/pagination";
import { BookingsTable } from "@/components/staff/bookings-table";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { bookingListQuerySchema } from "@/lib/validators/booking";
import { BOOKING_STATUSES } from "@/lib/status";
import { listBookingsForStaff } from "@/server/services/bookings";
import { listHotelOptions } from "@/server/services/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("bookingsTitle") };
}

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/bookings");
  const query = parseSearchParams(await searchParams, bookingListQuerySchema);
  const [t, ts, tv, locale, result, hotels] = await Promise.all([
    getTranslations("admin"),
    getTranslations("status.booking"),
    getTranslations("portal.views"),
    getLocale(),
    listBookingsForStaff(undefined, query),
    listHotelOptions(),
  ]);
  return (
    <>
      <PageHeader title={t("bookingsTitle")} description={t("bookingsSubtitle")} />
      <FiltersBar
        views={[
          { value: "upcoming", label: tv("upcoming") },
          { value: "past", label: tv("past") },
          { value: "all", label: tv("all") },
        ]}
        statuses={BOOKING_STATUSES.map((s) => ({ value: s, label: `${ts(s)}${result.counts[s] ? ` (${result.counts[s]})` : ""}` }))}
        extraSelect={{
          param: "hotelId",
          placeholder: t("allHotels"),
          options: hotels.map((h) => ({ value: h.id, label: locale === "ar" && h.nameAr ? h.nameAr : h.name })),
        }}
        exportUrl="/api/hotel/bookings/export"
      />
      <Card className="shadow-none">
        <BookingsTable rows={result.items} showHotel />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
