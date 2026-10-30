import { useLocale, useTranslations } from "next-intl";
import { MapPin, Package, Star, Users, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export interface FacilityCardData {
  slug: string;
  name: string;
  nameAr: string | null;
  type: string;
  description: string | null;
  descriptionAr: string | null;
  address: string | null;
  rating: number;
  reviewCount: number;
  specialties: string[];
  accreditations: string[];
  doctors: unknown[];
  treatmentPackages: { price: number; currency: string }[];
}

export function FacilityCard({ facility }: { facility: FacilityCardData }) {
  const locale = useLocale();
  const t = useTranslations("facilities");
  const name = locale === "ar" && facility.nameAr ? facility.nameAr : facility.name;
  const description = locale === "ar" && facility.descriptionAr ? facility.descriptionAr : facility.description;
  const minPrice = facility.treatmentPackages.length ? Math.min(...facility.treatmentPackages.map((p) => p.price)) : null;

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-primary">{t(`type.${facility.type}` as never)}</p>
            <CardTitle className="text-lg">
              <Link href={`/facilities/${facility.slug}`} className="hover:underline">
                {name}
              </Link>
            </CardTitle>
            {facility.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{facility.address}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1" title={`${facility.reviewCount}`}>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
            <span className="text-sm font-medium">{facility.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <div className="flex flex-wrap gap-1.5">
          {facility.accreditations.map((a) => (
            <Badge key={a} variant="outline" className="gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-primary" /> {a}
            </Badge>
          ))}
          {facility.specialties.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))}
          {facility.specialties.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{facility.specialties.length - 4}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {t("doctorsCount", { count: facility.doctors.length })}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> {t("packagesCount", { count: facility.treatmentPackages.length })}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        {minPrice !== null ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("priceFrom")} </span>
            <span className="font-semibold">{formatCurrency(minPrice, locale)}</span>
          </p>
        ) : (
          <span />
        )}
        <Button asChild size="sm">
          <Link href={`/facilities/${facility.slug}`}>{t("viewDetails")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
