import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Hotel } from "lucide-react";
import { HotelCard } from "@/components/hotels/hotel-card";
import { HotelFilters } from "@/components/hotels/hotel-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicHotels } from "@/server/services/hotels";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hotels");
  return { title: t("title"), description: t("subtitle") };
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; minStars?: string; accessible?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const minStars = Number(sp.minStars);
  const [t, locale, { hotels, facility }, facilities] = await Promise.all([
    getTranslations("hotels"),
    getLocale(),
    listPublicHotels({
      nearFacilityId: sp.facility || null,
      minStars: Number.isInteger(minStars) && minStars >= 1 && minStars <= 5 ? minStars : null,
      accessible: sp.accessible === "1",
      search: sp.q?.slice(0, 100) || null,
    }),
    prisma.facility.findMany({ where: { isActive: true }, select: { id: true, name: true, nameAr: true }, orderBy: { name: "asc" } }),
  ]);
  const facilityName = facility ? (locale === "ar" && facility.nameAr ? facility.nameAr : facility.name) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Hotel className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <p className="max-w-3xl text-muted-foreground">{t("subtitle")}</p>
      </div>
      <HotelFilters facilities={facilities} />
      {hotels.length === 0 ? (
        <EmptyState icon={Hotel} title={t("noResults")} className="py-20" />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {hotels.map((h) => (
            <HotelCard key={h.id} hotel={h} facilityName={facilityName} />
          ))}
        </div>
      )}
    </div>
  );
}
