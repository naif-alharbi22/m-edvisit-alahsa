"use client";

import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { StackedColumnChart } from "@/components/charts/stacked-column-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_ORDER, SERIES } from "@/components/charts/palette";
import { StatCard } from "@/components/portal/stat-card";
import { StatusBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { FacilityAnalytics } from "@/server/analytics/facility";
import { useFormatters } from "./use-formatters";

export function FacilityAnalyticsView({ data }: { data: FacilityAnalytics }) {
  const t = useTranslations("analytics");
  const ts = useTranslations("status.appointment");
  const tc = useTranslations("common");
  const f = useFormatters();
  const { kpis } = data;
  const g = data.granularity;
  const otherLabel = (label: string) => (label === "__other__" ? t("other") : label === "__unknown__" ? tc("unknown") : label);

  const series = data.series.map((s) => ({ ...s, label: f.bucket(s.key, g) }));
  const totals = data.series.map((s) => s.completed + s.other);

  const statusSegments = APPOINTMENT_STATUS_ORDER.map((status) => ({
    label: ts(status),
    value: data.byStatus.find((s) => s.status === status)?.value ?? 0,
    color: APPOINTMENT_STATUS_COLORS[status]!,
  }));
  const statusTotal = statusSegments.reduce((s, x) => s + x.value, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("appointments")} value={f.number(kpis.appointments.value)} change={kpis.appointments.change} trend={totals} />
        <StatCard
          label={t("revenue")}
          value={f.currencyCompact(kpis.revenue.value)}
          change={kpis.revenue.change}
          trend={data.series.map((s) => s.revenue)}
        />
        <StatCard label={t("completionRate")} value={f.percent(kpis.completionRate.value)} change={kpis.completionRate.change} />
        <StatCard label={t("noShowRate")} value={f.percent(kpis.noShowRate.value, 1)} upIsGood={false} />
        <StatCard label={t("uniquePatients")} value={f.number(kpis.uniquePatients.value)} change={kpis.uniquePatients.change} />
        <StatCard label={t("pendingRequests")} value={f.number(kpis.pendingRequests.value)} />
        <StatCard label={t("avgRating")} value={kpis.rating.value.toFixed(1)} hint={tc("reviewsCount", { count: kpis.rating.reviews })} />
        <StatCard label={t("avgVisitValue")} value={kpis.avgVisitValue.value ? f.currency(Math.round(kpis.avgVisitValue.value)) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title={t("appointmentsTrend")}
          legend={[
            { label: ts("COMPLETED"), color: SERIES[0] },
            { label: t("otherStatuses"), color: SERIES[1] },
          ]}
          empty={totals.every((v) => v === 0)}
          table={{
            columns: [tc("date"), ts("COMPLETED"), t("otherStatuses")],
            rows: series.map((s) => [s.label, s.completed, s.other]),
          }}
        >
          <StackedColumnChart
            data={series}
            series={[
              { key: "completed", label: ts("COMPLETED"), color: SERIES[0] },
              { key: "other", label: t("otherStatuses"), color: SERIES[1] },
            ]}
            formatValue={f.number}
          />
        </ChartCard>

        <ChartCard
          title={t("byStatus")}
          empty={statusTotal === 0}
          table={{
            columns: [tc("status"), t("count"), t("share")],
            rows: statusSegments.map((s) => [s.label, s.value, f.percent(statusTotal ? s.value / statusTotal : 0)]),
          }}
        >
          <SegmentedBar variant="thin" segments={statusSegments} formatShare={(r) => f.percent(r)} formatValue={f.number} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("revenueTrend")}
          empty={data.series.every((s) => s.revenue === 0)}
          table={{ columns: [tc("date"), t("revenue")], rows: series.map((s) => [s.label, f.currency(s.revenue)]) }}
        >
          <TrendChart
            data={series.map((s) => ({ label: s.label, value: s.revenue }))}
            seriesLabel={t("revenue")}
            formatValue={(v) => f.currency(v)}
            formatTick={f.compact}
          />
        </ChartCard>

        <ChartCard
          title={t("bySpecialty")}
          empty={data.bySpecialty.length === 0}
          table={{ columns: [t("specialty"), t("count")], rows: data.bySpecialty.map((s) => [otherLabel(s.label), s.value]) }}
        >
          <RankedBars items={data.bySpecialty.map((s) => ({ label: otherLabel(s.label), value: s.value, muted: s.label.startsWith("__") }))} formatValue={f.number} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("byNationality")}
          empty={data.byNationality.length === 0}
          table={{
            columns: [t("country"), t("patients")],
            rows: data.byNationality.map((n) => [n.label.startsWith("__") ? otherLabel(n.label) : f.country(n.label), n.value]),
          }}
        >
          <RankedBars
            items={data.byNationality.map((n) => ({
              label: n.label.startsWith("__") ? otherLabel(n.label) : f.country(n.label),
              value: n.value,
              muted: n.label.startsWith("__"),
            }))}
            formatValue={f.number}
          />
        </ChartCard>

        <Card className="shadow-none xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("byDoctor")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byDoctor.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noDataShort")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 text-start font-medium">{t("doctor")}</th>
                      <th className="py-2 text-end font-medium">{t("appointments")}</th>
                      <th className="py-2 text-end font-medium">{ts("COMPLETED")}</th>
                      <th className="py-2 text-end font-medium">{t("revenue")}</th>
                      <th className="py-2 text-end font-medium">{tc("rating")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDoctor.map((d) => (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="py-2">
                          <p className="font-medium">{f.locale === "ar" && d.nameAr ? d.nameAr : d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.specialty}</p>
                        </td>
                        <td className="py-2 text-end tabular-nums">{f.number(d.appointments)}</td>
                        <td className="py-2 text-end tabular-nums">{f.number(d.completed)}</td>
                        <td className="py-2 text-end tabular-nums">{f.currency(d.revenue)}</td>
                        <td className="py-2 text-end tabular-nums">{d.rating.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t("upcoming")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t("noUpcoming")} className="py-6" />
          ) : (
            <ul className="divide-y">
              {data.upcoming.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.patient ?? tc("unknown")}{" "}
                      {a.nationality && <span className="text-xs font-normal text-muted-foreground">· {f.country(a.nationality)}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.reference} · {a.specialty}
                      {a.doctor && ` · ${f.locale === "ar" && a.doctorAr ? a.doctorAr : a.doctor}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-muted-foreground">{f.dateTime(a.scheduledAt)}</span>
                    <StatusBadge kind="appointment" status={a.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
