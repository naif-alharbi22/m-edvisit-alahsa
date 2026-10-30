"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  /** Relative change vs previous period; null = no baseline ("New"); undefined = not shown. */
  change?: number | null;
  /** Whether an increase is good (revenue) or bad (no-show rate). */
  upIsGood?: boolean;
  hint?: string;
  trend?: number[];
}

/** Stat tile: label · value · signed delta vs previous period (icon + color + text) · optional sparkline. */
export function StatCard({ label, value, change, upIsGood = true, hint, trend }: StatCardProps) {
  const locale = useLocale();
  const t = useTranslations("portal");

  let delta: React.ReactNode = null;
  if (change === null) {
    delta = <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{t("newBadge")}</span>;
  } else if (change !== undefined) {
    const up = change > 0;
    const flat = change === 0;
    const good = flat ? null : up === upIsGood;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    delta = (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-semibold",
          good === null ? "text-muted-foreground" : good ? "text-[var(--delta-good)]" : "text-[var(--delta-bad)]"
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {flat ? t("noChange") : formatDelta(change, locale)}
      </span>
    );
  }

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend && <Sparkline values={trend} />}
        </div>
        {(delta || hint) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {delta}
            {change !== undefined && change !== null && <span>{t("vsPrevious")}</span>}
            {hint && <span>{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
