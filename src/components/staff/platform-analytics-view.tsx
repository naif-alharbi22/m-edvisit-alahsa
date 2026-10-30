"use client";

import { useTranslations } from "next-intl";
import { ChartCard } from "@/components/charts/chart-card";
import { StackedColumnChart } from "@/components/charts/stacked-column-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_ORDER, SERIES, URGENCY_COLORS, URGENCY_ORDER } from "@/components/charts/palette";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { PlatformAnalytics } from "@/server/analytics/platform";
import { useFormatters } from "./use-formatters";

function Meter({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full min-w-16 rounded-full bg-[color-mix(in_oklab,var(--chart-1)_18%,transparent)]" aria-hidden>
      <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

const FUNNEL_KEYS = {
  registered: "funnelRegistered",
  triaged: "funnelTriaged",
  booked: "funnelBooked",
  completed: "funnelCompleted",
  stayed: "funnelStayed",
} as const;

export function PlatformAnalyticsView({ data }: { data: PlatformAnalytics }) {
  const t = useTranslations("analytics");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const ta = useTranslations("admin");
  const f = useFormatters();
  const { kpis } = data;
  const series = data.series.map((s) => ({ ...s, label: f.bucket(s.key, data.granularity) }));
  const name = (o: { name: string; nameAr: string | null }) => (f.locale === "ar" && o.nameAr ? o.nameAr : o.name);
  const bucketLabel = (label: string) => (label === "__other__" ? t("other") : label === "__unknown__" ? tc("unknown") : label);

  const registered = data.funnel[0]?.value ?? 0;
  const funnelItems = data.funnel.map((s) => ({
    label: t(FUNNEL_KEYS[s.stage as keyof typeof FUNNEL_KEYS]),
    value: s.value,
    note: s.stage === "registered" ? undefined : f.percent(registered ? s.value / registered : 0),
  }));

  const urgencyTotal = data.urgencyMix.reduce((s, u) => s + u.value, 0);
  const urgencySegments = URGENCY_ORDER.map((u) => ({
    label: ts(`urgency.${u}`),
    value: data.urgencyMix.find((x) => x.urgency === u)?.value ?? 0,
    color: URGENCY_COLORS[u]!,
  }));
  const statusSegments = APPOINTMENT_STATUS_ORDER.map((s) => ({
    label: ts(`appointment.${s}`),
    value: data.appointmentsByStatus.find((x) => x.status === s)?.value ?? 0,
    color: APPOINTMENT_STATUS_COLORS[s]!,
  }));
  const statusTotal = statusSegments.reduce((s, x) => s + x.value, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("revenue")} value={f.currencyCompact(kpis.revenue.value)} change={kpis.revenue.change} trend={data.series.map((s) => s.medicalRevenue + s.hotelRevenue)} />
        <StatCard label={t("newPatients")} value={f.number(kpis.newPatients.value)} change={kpis.newPatients.change} trend={data.series.map((s) => s.registrations)} />
        <StatCard label={t("appointments")} value={f.number(kpis.appointments.value)} change={kpis.appointments.change} trend={data.series.map((s) => s.appointments)} />
        <StatCard label={t("completionRate")} value={f.percent(kpis.completionRate.value)} change={kpis.completionRate.change} />
        <StatCard label={t("patients")} value={f.number(kpis.totalPatients.value)} />
        <StatCard label={t("bookings")} value={f.number(kpis.hotelBookings.value)} change={kpis.hotelBookings.change} />
        <StatCard label={t("occupancy")} value={f.percent(kpis.occupancy.value, 1)} change={kpis.occupancy.change} />
        <StatCard label={t("avgRating")} value={kpis.avgRating.value.toFixed(2)} hint={tc("reviewsCount", { count: kpis.avgRating.reviews })} />
      </div>

      <ChartCard
        title={t("revenueTrend")}
        description={`${t("medicalRevenue")}: ${f.currency(kpis.medicalRevenue.value)} · ${t("hotelRevenue")}: ${f.currency(kpis.hotelRevenue.value)}`}
        legend={[
          { label: t("medicalRevenue"), color: SERIES[0] },
          { label: t("hotelRevenue"), color: SERIES[1] },
        ]}
        empty={data.series.every((s) => s.medicalRevenue + s.hotelRevenue === 0)}
        table={{
          columns: [tc("date"), t("medicalRevenue"), t("hotelRevenue")],
          rows: series.map((s) => [s.label, f.currency(s.medicalRevenue), f.currency(s.hotelRevenue)]),
        }}
      >
        <StackedColumnChart
          data={series}
          series={[
            { key: "medicalRevenue", label: t("medicalRevenue"), color: SERIES[0] },
            { key: "hotelRevenue", label: t("hotelRevenue"), color: SERIES[1] },
          ]}
          formatValue={(v) => f.currency(v)}
          formatTick={f.compact}
          height={260}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("registrations")}
          empty={data.series.every((s) => s.registrations === 0)}
          table={{ columns: [tc("date"), t("registrations")], rows: series.map((s) => [s.label, s.registrations]) }}
        >
          <TrendChart data={series.map((s) => ({ label: s.label, value: s.registrations }))} seriesLabel={t("registrations")} formatValue={f.number} />
        </ChartCard>
        <ChartCard
          title={t("appointmentsTrend")}
          empty={data.series.every((s) => s.appointments === 0)}
          table={{ columns: [tc("date"), t("appointments")], rows: series.map((s) => [s.label, s.appointments]) }}
        >
          <TrendChart data={series.map((s) => ({ label: s.label, value: s.appointments }))} seriesLabel={t("appointments")} formatValue={f.number} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("funnel")}
          description={t("funnelHint")}
          empty={registered === 0}
          table={{ columns: [t("stage"), t("count"), t("share")], rows: funnelItems.map((i) => [i.label, i.value, i.note ?? "100%"]) }}
        >
          <RankedBars items={funnelItems} formatValue={f.number} />
        </ChartCard>
        <ChartCard
          title={t("triageDemand")}
          empty={data.triageBySpecialty.length === 0}
          table={{ columns: [t("specialty"), t("count")], rows: data.triageBySpecialty.map((s) => [bucketLabel(s.label), s.value]) }}
        >
          <RankedBars
            items={data.triageBySpecialty.map((s) => ({ label: bucketLabel(s.label), value: s.value, muted: s.label.startsWith("__") }))}
            formatValue={f.number}
          />
        </ChartCard>
        <ChartCard
          title={t("byNationality")}
          empty={data.nationalities.length === 0}
          table={{
            columns: [t("country"), t("patients")],
            rows: data.nationalities.map((n) => [n.label.startsWith("__") ? bucketLabel(n.label) : f.country(n.label), n.value]),
          }}
        >
          <RankedBars
            items={data.nationalities.map((n) => ({
              label: n.label.startsWith("__") ? bucketLabel(n.label) : f.country(n.label),
              value: n.value,
              muted: n.label.startsWith("__"),
            }))}
            formatValue={f.number}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("urgencyMix")}
          empty={urgencyTotal === 0}
          table={{
            columns: [t("urgencyLevel"), t("count"), t("share")],
            rows: urgencySegments.map((s) => [s.label, s.value, f.percent(urgencyTotal ? s.value / urgencyTotal : 0)]),
          }}
        >
          <SegmentedBar segments={urgencySegments} formatShare={(r) => f.percent(r)} formatValue={f.number} />
        </ChartCard>
        <ChartCard
          title={`${t("appointments")} · ${t("byStatus")}`}
          empty={statusTotal === 0}
          table={{
            columns: [tc("status"), t("count"), t("share")],
            rows: statusSegments.map((s) => [s.label, s.value, f.percent(statusTotal ? s.value / statusTotal : 0)]),
          }}
        >
          <SegmentedBar segments={statusSegments} formatShare={(r) => f.percent(r)} formatValue={f.number} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("topFacilities")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t("facility")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{t("appointments")}</th>
                  <th className="w-32 py-2 text-start font-medium ps-4">{t("completionRate")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{t("revenue")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{tc("rating")}</th>
                </tr>
              </thead>
              <tbody>
                {data.facilityLeaderboard.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">
                      <Link href={`/admin/facilities/${r.id}`} className="font-medium hover:underline">
                        {name(r)}
                      </Link>
                      {!r.isActive && <Badge variant="outline" className="ms-2">{ta("hidden")}</Badge>}
                    </td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{f.number(r.appointments)}</td>
                    <td className="py-2.5 ps-4">
                      <div className="flex items-center gap-2">
                        <Meter value={r.completionRate} />
                        <span className="w-10 shrink-0 text-end text-xs tabular-nums">{f.percent(r.completionRate)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{f.currencyCompact(r.revenue)}</td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{r.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("topHotels")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t("hotel")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{t("bookings")}</th>
                  <th className="w-32 py-2 text-start font-medium ps-4">{t("occupancy")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{t("adr")}</th>
                  <th className="whitespace-nowrap py-2 ps-3 text-end font-medium">{t("revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.hotelLeaderboard.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">
                      <Link href={`/admin/hotels/${r.id}`} className="font-medium hover:underline">
                        {name(r)}
                      </Link>
                      {!r.isActive && <Badge variant="outline" className="ms-2">{ta("hidden")}</Badge>}
                    </td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{f.number(r.bookings)}</td>
                    <td className="py-2.5 ps-4">
                      <div className="flex items-center gap-2">
                        <Meter value={r.occupancy} />
                        <span className="w-10 shrink-0 text-end text-xs tabular-nums">{f.percent(r.occupancy)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{f.currency(Math.round(r.adr))}</td>
                    <td className="whitespace-nowrap py-2.5 ps-3 text-end tabular-nums">{f.currencyCompact(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
