import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Globe, Hotel, Languages, Mail, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentBookingProvider, BookAppointmentButton, BookAppointmentIcon } from "@/components/booking/appointment-booking";
import { getCurrentUser } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { countryName } from "@/lib/countries";
import { getPublicFacilityBySlug } from "@/server/services/facilities";
import { hotelsNearFacility } from "@/server/services/hotels";
import { listPatientReports } from "@/server/services/reports";

type Params = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  const facility = await getPublicFacilityBySlug(slug);
  if (!facility) return {};
  const name = locale === "ar" && facility.nameAr ? facility.nameAr : facility.name;
  const description = (locale === "ar" && facility.descriptionAr ? facility.descriptionAr : facility.description) ?? undefined;
  return { title: name, description, openGraph: { title: name, description } };
}

export default async function FacilityDetailPage({ params }: Params) {
  const { slug } = await params;
  const facility = await getPublicFacilityBySlug(slug);
  if (!facility) notFound();

  const [t, tc, locale, user, nearby] = await Promise.all([
    getTranslations("facilities"),
    getTranslations("common"),
    getLocale(),
    getCurrentUser(),
    hotelsNearFacility(facility, 3),
  ]);
  const reports = user?.role === "PATIENT" ? await listPatientReports(user.id, 10) : [];
  const ar = locale === "ar";
  const loc = (o: { name: string; nameAr: string | null }) => (ar && o.nameAr ? o.nameAr : o.name);
  const description = ar && facility.descriptionAr ? facility.descriptionAr : facility.description;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": facility.type === "HOSPITAL" ? "Hospital" : "MedicalClinic",
    name: facility.name,
    address: facility.address ?? undefined,
    telephone: facility.phone ?? undefined,
    medicalSpecialty: facility.specialties,
    ...(facility.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: facility.rating, reviewCount: facility.reviewCount } } : {}),
  };

  return (
    <AppointmentBookingProvider
      facility={{ id: facility.id, name: facility.name, nameAr: facility.nameAr, specialties: facility.specialties }}
      doctors={facility.doctors.map((d) => ({ id: d.id, name: d.name, nameAr: d.nameAr, specialty: d.specialty, consultationFee: d.consultationFee }))}
      packages={facility.treatmentPackages.map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr, specialty: p.specialty, price: p.price, currency: p.currency }))}
      reports={reports.map((r) => ({ id: r.id, fileName: r.fileName, specialty: r.specialty, createdAt: r.createdAt }))}
      isAuthenticated={Boolean(user)}
      loginHref={`/login?callbackUrl=${encodeURIComponent(`/${locale}/facilities/${slug}`)}`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ms-2">
          <Link href="/facilities">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("backToList")}
          </Link>
        </Button>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{t(`type.${facility.type}` as never)}</p>
            <h1 className="text-3xl font-bold tracking-tight">{loc(facility)}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
                <span className="font-medium text-foreground">{facility.rating.toFixed(1)}</span>
                <span>({tc("reviewsCount", { count: facility.reviewCount })})</span>
              </span>
              {facility.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {facility.address}
                </span>
              )}
            </div>
          </div>
          <BookAppointmentButton size="lg">
            <BookAppointmentIcon /> {t("bookAppointment")}
          </BookAppointmentButton>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("about")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="leading-relaxed text-muted-foreground">{description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {facility.specialties.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("packages")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {facility.treatmentPackages.length === 0 && <p className="text-sm text-muted-foreground">{t("noPackages")}</p>}
                {facility.treatmentPackages.map((p) => (
                  <div key={p.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{loc(p)}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{p.specialty}</Badge>
                          {p.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {p.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-start sm:text-end">
                        <p className="text-lg font-bold text-primary">{formatCurrency(p.price, locale, p.currency)}</p>
                      </div>
                    </div>
                    {(ar && p.descriptionAr ? p.descriptionAr : p.description) && (
                      <p className="mt-2 text-sm text-muted-foreground">{ar && p.descriptionAr ? p.descriptionAr : p.description}</p>
                    )}
                    {p.includes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.includes.map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs font-normal">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <BookAppointmentButton size="sm" variant="outline" packageId={p.id}>
                        {t("bookPackage")}
                      </BookAppointmentButton>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("doctors")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {facility.doctors.length === 0 && <p className="text-sm text-muted-foreground">{t("noDoctors")}</p>}
                {facility.doctors.map((d) => (
                  <div key={d.id} className="flex flex-col rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{loc(d)}</h3>
                        <p className="text-xs text-muted-foreground">{d.title}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden /> {d.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{d.specialty}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t("yearsExp", { years: d.yearsExp })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Languages className="h-3 w-3" /> {d.languages.join(", ")}
                      </span>
                    </div>
                    {(ar && d.bioAr ? d.bioAr : d.bio) && <p className="mt-2 text-sm text-muted-foreground">{ar && d.bioAr ? d.bioAr : d.bio}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <span className="text-xs text-muted-foreground">
                        {d.consultationFee ? t("consultationFee", { price: formatCurrency(d.consultationFee, locale) }) : ""}
                      </span>
                      <BookAppointmentButton size="sm" variant="outline" doctorId={d.id}>
                        {t("bookDoctor")}
                      </BookAppointmentButton>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("reviews")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {facility.reviews.length === 0 && <p className="text-sm text-muted-foreground">{t("noReviews")}</p>}
                {facility.reviews.map((r) => (
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
                <CardTitle className="text-lg">{t("contact")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {facility.phone && (
                  <a href={`tel:${facility.phone}`} className="flex items-center gap-2 hover:text-primary" dir="ltr">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {facility.phone}
                  </a>
                )}
                {facility.email && (
                  <a href={`mailto:${facility.email}`} className="flex items-center gap-2 hover:text-primary">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {facility.email}
                  </a>
                )}
                {facility.website && (
                  <a href={facility.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                    <Globe className="h-4 w-4 text-muted-foreground" /> {t("website")}
                  </a>
                )}
                {facility.accreditations.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("accreditations")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {facility.accreditations.map((a) => (
                        <Badge key={a} variant="outline" className="gap-1">
                          <ShieldCheck className="h-3 w-3 text-primary" /> {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {nearby.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Hotel className="h-5 w-5 text-primary" /> {t("stayNearby")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{t("stayNearbyHint")}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nearby.map((h) => (
                    <Link key={h.id} href={`/hotels/${h.slug}`} className="block rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <p className="font-medium">{loc(h)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span aria-label={`${h.starRating}`}>{"★".repeat(h.starRating)}</span>
                        {h.distanceKm !== null && <span>{t("kmAway", { km: h.distanceKm })}</span>}
                        {h.minPrice !== null && <span>· {formatCurrency(h.minPrice, locale)}</span>}
                      </p>
                    </Link>
                  ))}
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/hotels?facility=${facility.id}`}>{t("viewAllHotels")}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </AppointmentBookingProvider>
  );
}
