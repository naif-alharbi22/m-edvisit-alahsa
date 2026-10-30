import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Globe, Mail, MapPin, Phone, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomBooking } from "@/components/hotels/room-booking";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { countryName } from "@/lib/countries";
import { getPublicHotelBySlug } from "@/server/services/hotels";

type Params = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  const hotel = await getPublicHotelBySlug(slug);
  if (!hotel) return {};
  const name = locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name;
  const description = (locale === "ar" && hotel.descriptionAr ? hotel.descriptionAr : hotel.description) ?? undefined;
  return { title: name, description, openGraph: { title: name, description } };
}

export default async function HotelDetailPage({ params }: Params) {
  const { slug } = await params;
  const hotel = await getPublicHotelBySlug(slug);
  if (!hotel) notFound();
  const [t, tc, locale, user] = await Promise.all([getTranslations("hotels"), getTranslations("common"), getLocale(), getCurrentUser()]);
  const ar = locale === "ar";
  const appointments =
    user?.role === "PATIENT"
      ? await prisma.appointment.findMany({
          where: { userId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
          include: { facility: { select: { name: true, nameAr: true } } },
          orderBy: { scheduledAt: "asc" },
          take: 10,
        })
      : [];
  const name = ar && hotel.nameAr ? hotel.nameAr : hotel.name;
  const description = ar && hotel.descriptionAr ? hotel.descriptionAr : hotel.description;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    address: hotel.address ?? undefined,
    telephone: hotel.phone ?? undefined,
    starRating: { "@type": "Rating", ratingValue: hotel.starRating },
    amenityFeature: hotel.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a })),
    ...(hotel.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: hotel.rating, reviewCount: hotel.reviewCount } } : {}),
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Button asChild variant="ghost" size="sm" className="mb-4 -ms-2">
        <Link href="/hotels">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("backToList")}
        </Link>
      </Button>
      <div className="mb-8 space-y-2">
        <p className="text-sm tracking-widest text-amber-500" aria-label={`${hotel.starRating}★`}>
          {"★".repeat(hotel.starRating)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
            <span className="font-medium text-foreground">{hotel.rating.toFixed(1)}</span> ({tc("reviewsCount", { count: hotel.reviewCount })})
          </span>
          {hotel.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {hotel.address}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {description && <p className="leading-relaxed text-muted-foreground">{description}</p>}
          <section aria-labelledby="rooms-heading" className="space-y-3">
            <h2 id="rooms-heading" className="text-xl font-semibold">
              {t("roomTypes")}
            </h2>
            <RoomBooking
              hotelId={hotel.id}
              roomTypes={hotel.roomTypes}
              isAuthenticated={Boolean(user)}
              loginHref={`/login?callbackUrl=${encodeURIComponent(`/${locale}/hotels/${slug}`)}`}
              appointments={appointments.map((a) => ({
                id: a.id,
                reference: a.reference,
                scheduledAt: a.scheduledAt,
                facilityName: ar && a.facility.nameAr ? a.facility.nameAr : a.facility.name,
              }))}
            />
          </section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("reviews")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hotel.reviews.length === 0 && <p className="text-sm text-muted-foreground">{t("noReviews")}</p>}
              {hotel.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {r.user.name?.split(" ")[0] ?? "—"}
                      {r.user.nationality && <span className="ms-1 text-xs font-normal text-muted-foreground">· {countryName(r.user.nationality, locale)}</span>}
                    </span>
                    <span className="flex items-center gap-0.5" aria-label={`${r.rating}/5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} aria-hidden />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground/80">{formatDate(r.createdAt, locale)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("amenities")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {hotel.amenities.map((a) => (
                  <Badge key={a} variant="secondary" className="font-normal">
                    {a}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {t("checkInTime", { time: hotel.checkInTime })}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {t("checkOutTime", { time: hotel.checkOutTime })}
                </p>
              </div>
              <div className="space-y-2 border-t pt-4 text-sm">
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 hover:text-primary" dir="ltr">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {hotel.phone}
                  </a>
                )}
                {hotel.email && (
                  <a href={`mailto:${hotel.email}`} className="flex items-center gap-2 hover:text-primary">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {hotel.email}
                  </a>
                )}
                {hotel.website && (
                  <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                    <Globe className="h-4 w-4 text-muted-foreground" /> {hotel.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
