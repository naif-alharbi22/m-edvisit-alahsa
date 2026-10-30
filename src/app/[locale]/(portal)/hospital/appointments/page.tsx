import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hospital");
  return { title: t("appointmentsTitle") };
}

export default async function HospitalAppointmentsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital/appointments");
  const query = parseSearchParams(await searchParams, appointmentListQuerySchema);
  const [t, ts, tp, result] = await Promise.all([
    getTranslations("hospital"),
    getTranslations("status.appointment"),
    getTranslations("portal.views"),
    listAppointmentsForStaff(user.facilityId!, query),
  ]);
  return (
    <>
      <PageHeader title={t("appointmentsTitle")} description={t("appointmentsSubtitle")} />
      <FiltersBar
        views={[
          { value: "upcoming", label: tp("upcoming") },
          { value: "past", label: tp("past") },
          { value: "all", label: tp("all") },
        ]}
        statuses={APPOINTMENT_STATUSES.map((s) => ({ value: s, label: `${ts(s)}${result.counts[s] ? ` (${result.counts[s]})` : ""}` }))}
        exportUrl="/api/hospital/appointments/export"
      />
      <Card className="shadow-none">
        <AppointmentsTable rows={result.items} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
