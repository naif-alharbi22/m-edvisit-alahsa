import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hotelPortal");
  return { title: t("bookingsTitle") };
}

export default async function HotelBookingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requirePageRole(["HOTEL_MANAGER"], "/hotel/bookings");
  const query = parseSearchParams(await searchParams, bookingListQuerySchema);
  const [t, ts, tv, result] = await Promise.all([
    getTranslations("hotelPortal"),
    getTranslations("status.booking"),
    getTranslations("portal.views"),
    listBookingsForStaff(user.hotelId!, query),
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
        exportUrl="/api/hotel/bookings/export"
      />
      <Card className="shadow-none">
        <BookingsTable rows={result.items} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
