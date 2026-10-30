"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface LegendItem {
  label: string;
  color: string;
  kind?: "rect" | "line";
}

interface ChartCardProps {
  title: string;
  description?: string;
  table: ChartTable;
  legend?: LegendItem[];
  className?: string;
  children: React.ReactNode;
  empty?: boolean;
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.kind === "line" ? (
            <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} aria-hidden />
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Chart container with a table-view twin (the accessible equivalent of every chart). */
export function ChartCard({ title, description, table, legend, className, children, empty }: ChartCardProps) {
  const t = useTranslations("charts");
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <Card className={cn("flex flex-col shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {!empty && (
          <div className="flex shrink-0 rounded-md border p-0.5" role="group" aria-label={t("viewToggle")}>
            <button
              type="button"
              onClick={() => setView("chart")}
              aria-pressed={view === "chart"}
              aria-label={t("showChart")}
              className={cn("rounded px-1.5 py-1", view === "chart" ? "bg-muted text-foreground" : "text-muted-foreground")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              aria-label={t("showTable")}
              className={cn("rounded px-1.5 py-1", view === "table" ? "bg-muted text-foreground" : "text-muted-foreground")}
            >
              <Table2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noData")}</p>
        ) : view === "chart" ? (
          <>
            {legend && legend.length > 1 && <Legend items={legend} />}
            {children}
          </>
        ) : (
          <div className="max-h-80 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className={cn("px-3 py-1.5", j > 0 && "tabular-nums")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
