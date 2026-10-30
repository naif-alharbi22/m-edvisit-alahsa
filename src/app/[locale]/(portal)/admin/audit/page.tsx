import type { Metadata } from "next";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { Pagination } from "@/components/portal/pagination";
import { AuditTable } from "@/components/staff/admin-managers";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { listQuerySchema } from "@/lib/validators/common";
import { listAuditLogs } from "@/server/services/audit";

const ENTITY_TYPES = ["Appointment", "HotelBooking", "User", "Facility", "Doctor", "TreatmentPackage", "Hotel", "RoomType", "System"];
const querySchema = listQuerySchema.extend({ entityType: z.enum(ENTITY_TYPES as [string, ...string[]]).optional().catch(undefined) });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("auditTitle") };
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/audit");
  const query = parseSearchParams(await searchParams, querySchema);
  const [t, result] = await Promise.all([getTranslations("admin"), listAuditLogs({ ...query, pageSize: 50 })]);
  return (
    <>
      <PageHeader title={t("auditTitle")} description={t("auditSubtitle")} />
      <FiltersBar showDates={false} extraSelect={{ param: "entityType", placeholder: t("entity"), options: ENTITY_TYPES.map((e) => ({ value: e, label: e })) }} />
      <Card className="shadow-none">
        <AuditTable rows={result.items} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
