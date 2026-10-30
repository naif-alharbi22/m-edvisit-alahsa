"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  CONFIRMED: "bg-blue-50 text-blue-800 ring-blue-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  CHECKED_IN: "bg-teal-50 text-teal-800 ring-teal-600/20",
  CHECKED_OUT: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  CANCELLED: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  NO_SHOW: "bg-rose-50 text-rose-800 ring-rose-600/20",
  LOW: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  MODERATE: "bg-amber-50 text-amber-800 ring-amber-600/20",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-600/20",
  EMERGENCY: "bg-red-50 text-red-800 ring-red-600/20",
};

export function StatusBadge({ kind, status, className }: { kind: "appointment" | "booking" | "urgency"; status: string; className?: string }) {
  const t = useTranslations("status");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status] ?? "bg-muted text-muted-foreground ring-border",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {t(`${kind}.${status}` as never)}
    </span>
  );
}
