import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Bed, Building2, CalendarCheck, FileText, Hotel, MessageSquare, Stethoscope, Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/portal/status-badge";
import { CancelButton, ReviewButton } from "@/components/dashboard/patient-actions";
import { requirePageUser } from "@/lib/session";
import { homePathForRole } from "@/lib/roles";
import { formatCurrency, formatDateOnly, formatDateTime, formatDate } from "@/lib/format";
import { nightsBetween } from "@/lib/utils";
import { requestTime } from "@/lib/clock";
import { listPatientAppointments } from "@/server/services/appointments";
import { listPatientBookings } from "@/server/services/bookings";
import { listPatientReports } from "@/server/services/reports";
import { getChatHistory } from "@/server/services/chat";
import { countUnread } from "@/server/services/notifications";
import { getReviewedTargets } from "@/server/services/reviews";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const locale = await getLocale();
  if (user.role !== "PATIENT") redirect(`/${locale}${homePathForRole(user.role)}`);

  const [t, tc, appointments, bookings, reports, chat, unread, reviewed] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    listPatientAppointments(user.id),
    listPatientBookings(user.id),
    listPatientReports(user.id, 6),
    getChatHistory(user.id, 2),
    countUnread(user.id),
    getReviewedTargets(user.id),
  ]);

  const now = requestTime();
  const ar = locale === "ar";
  const loc = (o: { name: string; nameAr: string | null }) => (ar && o.nameAr ? o.nameAr : o.name);
  const upcoming = appointments.filter((a) => a.scheduledAt.getTime() >= now && ["PENDING", "CONFIRMED"].includes(a.status)).reverse();
  const past = appointments.filter((a) => !upcoming.includes(a)).slice(0, 6);
  const todayStr = new Date(now + 3 * 3_600_000).toISOString().slice(0, 10);
  const activeStays = bookings.filter((b) => b.checkOut.toISOString().slice(0, 10) >= todayStr && b.status !== "CANCELLED");
  const otherStays = bookings.filter((b) => !activeStays.includes(b)).slice(0, 4);
  const lastAssistant = [...chat].reverse().find((m) => m.role === "assistant");

  const stats = [
    { icon: CalendarCheck, label: t("stats.upcomingAppointments"), value: upcoming.length },
    { icon: Bed, label: t("stats.activeStays"), value: activeStays.length },
    { icon: FileText, label: t("stats.reports"), value: reports.length },
    { icon: Bell, label: t("stats.unread"), value: unread },
  ];

  const AppointmentItem = ({ a }: { a: (typeof appointments)[number] }) => {
    const canCancel = ["PENDING", "CONFIRMED"].includes(a.status) && a.scheduledAt.getTime() > now;
    const canReview = a.status === "COMPLETED" && !reviewed.facilities.has(a.facility.id);
    return (
      <li className="space-y-2 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/facilities/${a.facility.slug}`} className="font-medium hover:underline">
              {loc(a.facility)}
            </Link>
            <p className="text-xs text-muted-foreground">
              {a.specialty}
              {a.doctor && ` · ${loc(a.doctor)}`}
              {a.package && ` · ${loc(a.package)}`}
            </p>
          </div>
          <StatusBadge kind="appointment" status={a.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatDateTime(a.scheduledAt, locale)} · <span className="font-mono">{a.reference}</span>
            {a.price ? ` · ${formatCurrency(a.price, locale, a.currency)}` : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {canCancel && a.hotelBookings.length === 0 && (
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href={`/hotels?facility=${a.facility.id}`}>
                  <Hotel className="h-3.5 w-3.5" /> {t("bookStay")}
                </Link>
              </Button>
            )}
            {a.hotelBookings[0] && <span>{t("linkedTo", { reference: a.hotelBookings[0].reference })}</span>}
            {canCancel && <CancelButton kind="appointment" id={a.id} reference={a.reference} />}
            {canReview && <ReviewButton target={{ facilityId: a.facility.id }} name={loc(a.facility)} />}
            {a.status === "COMPLETED" && reviewed.facilities.has(a.facility.id) && (
              <span>{t("reviewed", { rating: reviewed.facilities.get(a.facility.id)! })}</span>
            )}
          </div>
        </div>
      </li>
    );
  };

  const StayItem = ({ b }: { b: (typeof bookings)[number] }) => {
    const canCancel = ["PENDING", "CONFIRMED"].includes(b.status) && b.checkIn.toISOString().slice(0, 10) >= todayStr;
    const canReview = b.status === "CHECKED_OUT" && !reviewed.hotels.has(b.hotel.id);
    return (
      <li className="space-y-2 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/hotels/${b.hotel.slug}`} className="font-medium hover:underline">
              {loc(b.hotel)}
            </Link>
            <p className="text-xs text-muted-foreground">
              {loc(b.roomType)} · {tc("nights", { count: nightsBetween(b.checkIn, b.checkOut) })} · {tc("guests", { count: b.guests })}
            </p>
          </div>
          <StatusBadge kind="booking" status={b.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatDateOnly(b.checkIn, locale)} – {formatDateOnly(b.checkOut, locale)} · <span className="font-mono">{b.reference}</span> ·{" "}
            {formatCurrency(b.totalPrice, locale, b.currency)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {b.appointment && <span>{t("linkedTo", { reference: b.appointment.reference })}</span>}
            {canCancel && <CancelButton kind="booking" id={b.id} reference={b.reference} />}
            {canReview && <ReviewButton target={{ hotelId: b.hotel.id }} name={loc(b.hotel)} />}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("welcome", { name: user.name?.split(" ")[0] ?? "" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/triage">
              <Stethoscope className="h-4 w-4" /> {t("newReport")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/facilities">
              <Building2 className="h-4 w-4" /> {t("bookAppointment")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/hotels">
              <Hotel className="h-4 w-4" /> {t("findHotel")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarCheck className="h-5 w-5" /> {t("appointments")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title={t("noAppointments")}
                action={
                  <Button asChild size="sm">
                    <Link href="/facilities">{t("bookAppointment")}</Link>
                  </Button>
                }
              />
            ) : (
              <>
                {upcoming.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("upcoming")}</h2>
                    <ul className="space-y-2">
                      {upcoming.map((a) => (
                        <AppointmentItem key={a.id} a={a} />
                      ))}
                    </ul>
                  </section>
                )}
                {past.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("history")}</h2>
                    <ul className="space-y-2">
                      {past.map((a) => (
                        <AppointmentItem key={a.id} a={a} />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bed className="h-5 w-5" /> {t("hotelStays")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookings.length === 0 ? (
              <EmptyState
                icon={Hotel}
                title={t("noStays")}
                action={
                  <Button asChild size="sm">
                    <Link href="/hotels">{t("findHotel")}</Link>
                  </Button>
                }
              />
            ) : (
              <>
                {activeStays.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("upcoming")}</h2>
                    <ul className="space-y-2">
                      {activeStays.map((b) => (
                        <StayItem key={b.id} b={b} />
                      ))}
                    </ul>
                  </section>
                )}
                {otherStays.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("history")}</h2>
                    <ul className="space-y-2">
                      {otherStays.map((b) => (
                        <StayItem key={b.id} b={b} />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" /> {t("reports")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/triage">
                {t("newReport")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <EmptyState icon={FileText} title={t("noReports")} />
            ) : (
              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r.id} className="space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.fileName}</span>
                      {r.urgency && <StatusBadge kind="urgency" status={r.urgency} />}
                    </div>
                    {r.summary && <p className="line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {r.specialty ? (
                        <Link href={`/facilities?specialty=${encodeURIComponent(r.specialty)}`} className="text-primary hover:underline">
                          {r.specialty}
                        </Link>
                      ) : (
                        <span />
                      )}
                      <span>{formatDate(r.createdAt, locale)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" /> {t("recentChat")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/chat">
                {t("openChat")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lastAssistant ? (
              <div className="rounded-lg border p-3">
                <p className="line-clamp-3 text-sm">{lastAssistant.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(lastAssistant.createdAt, locale)}</p>
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title={t("noChats")} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
