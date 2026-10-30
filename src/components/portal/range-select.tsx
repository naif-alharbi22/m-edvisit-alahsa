"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const RANGES = ["30d", "90d", "12m"] as const;
export type RangeValue = (typeof RANGES)[number];

/**
 * Filter row (date range first) above everything it scopes. While the new
 * range loads, the previous render stays visible at reduced opacity.
 */
export function AnalyticsFrame({ range, children, extra }: { range: RangeValue; children: React.ReactNode; extra?: React.ReactNode }) {
  const t = useTranslations("portal.range");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border bg-background p-0.5" role="radiogroup" aria-label={t("label")}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("range", r);
                startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
              }}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {t(r)}
            </button>
          ))}
        </div>
        {extra}
      </div>
      <div className={cn("space-y-6 transition-opacity", pending && "pointer-events-none opacity-50")} aria-busy={pending}>
        {children}
      </div>
    </div>
  );
}
