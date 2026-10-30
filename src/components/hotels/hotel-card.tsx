import { useLocale, useTranslations } from "next-intl";
import { Accessibility, MapPin, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export interface HotelCardData {
  slug: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  address: string | null;
  starRating: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  minPrice: number | null;
  distanceKm: number | null;
  roomTypes: { accessible: boolean }[];
}

export function HotelCard({ hotel, facilityName }: { hotel: HotelCardData; facilityName?: string | null }) {
  const locale = useLocale();
  const t = useTranslations("hotels");
  const name = locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name;
  const description = locale === "ar" && hotel.descriptionAr ? hotel.descriptionAr : hotel.description;
  const accessible = hotel.roomTypes.some((r) => r.accessible);
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-1 text-sm tracking-widest text-amber-500" aria-label={`${hotel.starRating}★`}>
              {"★".repeat(hotel.starRating)}
            </p>
            <CardTitle className="text-lg">
              <Link href={`/hotels/${hotel.slug}`} className="hover:underline">
                {name}
              </Link>
            </CardTitle>
            {hotel.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{hotel.address}</span>
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden /> {hotel.rating.toFixed(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {hotel.distanceKm !== null && facilityName && (
          <p className="text-sm font-medium text-primary">{t("kmFrom", { km: hotel.distanceKm, facility: facilityName })}</p>
        )}
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <div className="flex flex-wrap gap-1.5">
          {accessible && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Accessibility className="h-3 w-3 text-primary" /> {t("accessible")}
            </Badge>
          )}
          {hotel.amenities.slice(0, 4).map((a) => (
            <Badge key={a} variant="secondary" className="text-xs font-normal">
              {a}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        {hotel.minPrice !== null ? (
          <p className="text-sm">
            <span className="font-semibold">{t("from", { price: formatCurrency(hotel.minPrice, locale) })}</span>
            <span className="text-muted-foreground"> / {t("perNightShort")}</span>
          </p>
        ) : (
          <span />
        )}
        <Button asChild size="sm">
          <Link href={`/hotels/${hotel.slug}`}>{t("viewHotel")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
