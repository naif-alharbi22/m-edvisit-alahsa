"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipContent } from "./chart-tooltip";

export interface StackSeries {
  key: string;
  label: string;
  color: string;
}

interface StackedColumnChartProps {
  data: Record<string, string | number>[];
  series: StackSeries[];
  formatValue: (v: number) => string;
  formatTick?: (v: number) => string;
  height?: number;
}

/**
 * Stacked columns: ≤24px thick, 2px surface gap between segments (surface-colored
 * stroke), 4px rounded data-end on the top segment only, square at the baseline.
 */
export function StackedColumnChart({ data, series, formatValue, formatTick, height = 240 }: StackedColumnChartProps) {
  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tick={{ fill: "var(--chart-muted-ink)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-muted-ink)", fontSize: 11 }}
            tickFormatter={formatTick ?? formatValue}
            width={64}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.5 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipContent
                  title={String(label)}
                  rows={[...series].reverse().map((s) => {
                    const p = payload.find((x) => x.dataKey === s.key);
                    return { label: s.label, value: formatValue(Number(p?.value ?? 0)), color: s.color };
                  })}
                />
              ) : null
            }
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="stack"
              fill={s.color}
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
