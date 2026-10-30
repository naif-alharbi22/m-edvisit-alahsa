import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { FacilitiesManager } from "@/components/staff/admin-managers";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { listQuerySchema } from "@/lib/validators/common";
import { listFacilitiesAdmin } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("facilitiesTitle") };
}

export default async function AdminFacilitiesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/facilities");
  const query = parseSearchParams(await searchParams, listQuerySchema);
  const [t, result] = await Promise.all([getTranslations("admin"), listFacilitiesAdmin({ q: query.q, page: 1, pageSize: 100 })]);
  return (
    <>
      <PageHeader title={t("facilitiesTitle")} description={t("facilitiesSubtitle")} />
      <FiltersBar showDates={false} />
      <FacilitiesManager rows={result.items} />
    </>
  );
}
