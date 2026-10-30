import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { HotelsManager } from "@/components/staff/admin-managers";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { listQuerySchema } from "@/lib/validators/common";
import { listHotelsAdmin } from "@/server/services/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("hotelsTitle") };
}

export default async function AdminHotelsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requirePageRole(["SUPER_ADMIN"], "/admin/hotels");
  const query = parseSearchParams(await searchParams, listQuerySchema);
  const [t, result] = await Promise.all([getTranslations("admin"), listHotelsAdmin({ q: query.q, page: 1, pageSize: 100 })]);
  return (
    <>
      <PageHeader title={t("hotelsTitle")} description={t("hotelsSubtitle")} />
      <FiltersBar showDates={false} />
      <HotelsManager rows={result.items} />
    </>
  );
}
