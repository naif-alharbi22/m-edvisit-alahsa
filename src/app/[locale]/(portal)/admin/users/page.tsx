import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/portal/page-header";
import { FiltersBar } from "@/components/portal/filters-bar";
import { Pagination } from "@/components/portal/pagination";
import { UsersManager } from "@/components/staff/admin-managers";
import { requirePageRole } from "@/lib/session";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { userListQuerySchema } from "@/lib/validators/user";
import { ROLES, type AppRole } from "@/lib/roles";
import { listUsers } from "@/server/services/users";
import { listFacilityOptions } from "@/server/services/facilities";
import { listHotelOptions } from "@/server/services/hotels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("usersTitle") };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requirePageRole(["SUPER_ADMIN"], "/admin/users");
  const query = parseSearchParams(await searchParams, userListQuerySchema);
  const [t, tr, result, facilities, hotels] = await Promise.all([
    getTranslations("admin"),
    getTranslations("roles"),
    listUsers(query),
    listFacilityOptions(),
    listHotelOptions(),
  ]);
  return (
    <>
      <PageHeader title={t("usersTitle")} description={t("usersSubtitle")} />
      <FiltersBar showDates={false} extraSelect={{ param: "role", placeholder: t("allRoles"), options: ROLES.map((r) => ({ value: r, label: tr(r) })) }} />
      <Card className="shadow-none">
        <UsersManager
          rows={result.items.map((u) => ({ ...u, role: u.role as AppRole }))}
          facilities={facilities}
          hotels={hotels}
          currentUserId={user.id}
        />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </Card>
    </>
  );
}
