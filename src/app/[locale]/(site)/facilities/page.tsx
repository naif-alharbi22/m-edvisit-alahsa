import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { FacilityCard } from "@/components/facilities/facility-card";
import { FacilityFilters } from "@/components/facilities/facility-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicFacilities, listSpecialties } from "@/server/services/facilities";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("facilities");
  return { title: t("title"), description: t("subtitle") };
}

export default async function FacilitiesPage({ searchParams }: { searchParams: Promise<{ specialty?: string; q?: string }> }) {
  const { specialty, q } = await searchParams;
  const [t, facilities, specialties] = await Promise.all([
    getTranslations("facilities"),
    listPublicFacilities({ specialty: specialty || null, search: q?.slice(0, 100) || null }),
    listSpecialties(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <FacilityFilters specialties={specialties} />
      {facilities.length === 0 ? (
        <EmptyState icon={Building2} title={t("noResults")} className="py-20" />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {facilities.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}
    </div>
  );
}
