"use client";

import { useTranslations } from "next-intl";
import { DoorOpen, LogIn, LogOut, Users } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { StackedColumnChart } from "@/components/charts/stacked-column-chart";
import { SERIES } from "@/components/charts/palette";
import { StatCard } from "@/components/portal/stat-card";
import { StatusBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { HotelAnalytics } from "@/server/analytics/hotel";
import { useFormatters } from "./use-formatters";

function Meter({ value }: { value: number }) {
  // Same-ramp track: lighter step of the fill's hue.
  return (
    <div className="h-1.5 w-full rounded-full bg-[color-mix(in_oklab,var(--chart-1)_18%,transparent)]" aria-hidden>
      <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

export function HotelAnalyticsView({ data }: { data: HotelAnalytics }) {
  const t = useTranslations("analytics");
  const tc = useTranslations("common");
  const f = useFormatters();
  const { kpis, operations } = data;
  const series = data.series.map((s) => ({ ...s, label: f.bucket(s.key, data.granularity) }));

  const ops = [
    { icon: LogIn, label: t("arrivals"), value: operations.arrivalsToday },
    { icon: LogOut, label: t("departures"), value: operations.departuresToday },
    { icon: Users, label: t("inHouse"), value: operations.inHouseGuests },
    { icon: DoorOpen, label: t("roomsOccupied", { total: data.inventory }), value: operations.roomsOccupied },
  ];

  return (
    <>
      <Card className="shadow-none">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          {ops.map((o) => (
            <div key={o.label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <o.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">{f.number(o.value)}</p>
                <p className="text-xs text-muted-foreground">{o.label}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("occupancy")} value={f.percent(kpis.occupancy.value, 1)} change={kpis.occupancy.change} trend={data.series.map((s) => s.occupancy)} />
        <StatCard label={t("adr")} value={f.currency(Math.round(kpis.adr.value))} change={kpis.adr.change} hint={t("adrHint")} />
        <StatCard label={t("revpar")} value={f.currency(Math.round(kpis.revpar.value))} change={kpis.revpar.change} hint={t("revparHint")} />
        <StatCard label={t("roomRevenue")} value={f.currencyCompact(kpis.revenue.value)} change={kpis.revenue.change} trend={data.series.map((s) => s.revenue)} />
        <StatCard label={t("bookings")} value={f.number(kpis.bookings.value)} change={kpis.bookings.change} />
        <StatCard label={t("avgStay")} value={t("avgStayValue", { value: f.number(kpis.avgStay.value) })} />
        <StatCard label={t("cancellationRate")} value={f.percent(kpis.cancellationRate.value, 1)} upIsGood={false} />
        <StatCard label={t("medicalLinked")} value={f.percent(kpis.medicalLinked.value)} hint={`${t("avgRating")}: ${kpis.rating.value.toFixed(1)}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("occupancyTrend")}
          empty={data.inventory === 0}
          table={{ columns: [tc("date"), t("occupancy"), t("nights")], rows: series.map((s) => [s.label, f.percent(s.occupancy, 1), s.soldRoomNights ?? ""]) }}
        >
          <TrendChart
            data={series.map((s) => ({ label: s.label, value: Math.round(s.occupancy * 1000) / 10 }))}
            seriesLabel={t("occupancy")}
            formatValue={(v) => `${f.number(v)}%`}
            domainMax={100}
          />
        </ChartCard>
        <ChartCard
          title={t("revenueTrend")}
          empty={data.series.every((s) => s.revenue === 0)}
          table={{ columns: [tc("date"), t("roomRevenue")], rows: series.map((s) => [s.label, f.currency(s.revenue)]) }}
        >
          <StackedColumnChart
            data={series}
            series={[{ key: "revenue", label: t("roomRevenue"), color: SERIES[0] }]}
            formatValue={(v) => f.currency(v)}
            formatTick={f.compact}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="shadow-none xl:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("roomPerformance")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t("roomType")}</th>
                  <th className="w-40 py-2 text-start font-medium">{t("occupancy")}</th>
                  <th className="py-2 text-end font-medium">{t("nights")}</th>
                  <th className="py-2 text-end font-medium">{t("adr")}</th>
                  <th className="py-2 text-end font-medium">{t("roomRevenue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.roomPerformance.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium">{f.locale === "ar" && r.nameAr ? r.nameAr : r.name}</p>
                      <p className="text-xs text-muted-foreground">{tc("rooms", { count: r.rooms })}</p>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Meter value={r.occupancy} />
                        <span className="w-12 shrink-0 text-end text-xs tabular-nums">{f.percent(r.occupancy)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-end tabular-nums">{f.number(r.soldRoomNights)}</td>
                    <td className="py-2.5 text-end tabular-nums">{f.currency(Math.round(r.adr))}</td>
                    <td className="py-2.5 text-end tabular-nums">{f.currency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-none xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("upcomingArrivals")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingArrivals.length === 0 ? (
              <EmptyState icon={LogIn} title={t("noArrivals")} className="py-6" />
            ) : (
              <ul className="divide-y">
                {data.upcomingArrivals.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.guest ?? tc("unknown")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.reference} · {f.locale === "ar" && b.roomAr ? b.roomAr : b.room} · {tc("nights", { count: Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000) })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs tabular-nums text-muted-foreground">{f.dateOnly(b.checkIn)}</span>
                      <StatusBadge kind="booking" status={b.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
