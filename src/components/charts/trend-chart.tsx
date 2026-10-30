"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipContent } from "./chart-tooltip";
import { SERIES } from "./palette";

export interface TrendPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  seriesLabel: string;
  formatValue: (v: number) => string;
  formatTick?: (v: number) => string;
  color?: string;
  height?: number;
  domainMax?: number;
}

/** Single-series trend: 2px line over a 10% wash, crosshair tooltip, hairline grid. */
export function TrendChart({ data, seriesLabel, formatValue, formatTick, color = SERIES[0], height = 220, domainMax }: TrendChartProps) {
  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tick={{ fill: "var(--chart-muted-ink)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-muted-ink)", fontSize: 11 }}
            tickFormatter={formatTick ?? formatValue}
            width={64}
            domain={[0, domainMax ?? "auto"]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipContent
                  title={String(label)}
                  rows={[{ label: seriesLabel, value: formatValue(Number(payload[0]!.value)), color }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesLabel}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
