import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { Pagination } from "@/components/portal/pagination";
import { AppointmentsTable } from "@/components/staff/appointments-table";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { appointmentListQuerySchema } from "@/lib/validators/appointment";
import { APPOINTMENT_STATUSES } from "@/lib/status";
import { listAppointmentsForStaff } from "@/server/services/appointments";
import { listFacilityOptions } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("appointmentsTitle") };
}

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/appointments");
  const query = parseSearchParams(await searchParams, appointmentListQuerySchema);
  const [t, ts, tv, locale, result, facilities] = await Promise.all([
    getTranslations("admin"),
    getTranslations("status.appointment"),
    getTranslations("portal.views"),
    getLocale(),
    listAppointmentsForStaff(undefined, query),
    listFacilityOptions(),
  ]);
  return (
    <>
      <PageHeader title={t("appointmentsTitle")} description={t("appointmentsSubtitle")} />
      <FiltersBar
        views={[
          { value: "upcoming", label: tv("upcoming") },
          { value: "past", label: tv("past") },
          { value: "all", label: tv("all") },
        ]}
        statuses={APPOINTMENT_STATUSES.map((s) => ({ value: s, label: `${ts(s)}${result.counts[s] ? ` (${result.counts[s]})` : ""}` }))}
        extraSelect={{
          param: "facilityId",
          placeholder: t("allFacilities"),
          options: facilities.map((f) => ({ value: f.id, label: locale === "ar" && f.nameAr ? f.nameAr : f.name })),
        }}
        exportUrl="/api/hospital/appointments/export"
      />
      <Card className="shadow-none">
        <AppointmentsTable rows={result.items} showFacility />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
