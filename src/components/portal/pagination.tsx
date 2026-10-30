"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };

  const linkClass = (disabled: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium",
      disabled ? "pointer-events-none opacity-40" : "hover:bg-muted"
    );

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t px-3 py-3 text-xs text-muted-foreground sm:flex-row">
      <span>{t("totalResults", { count: total })}</span>
      <div className="flex items-center gap-2">
        <Link href={hrefFor(page - 1)} className={linkClass(page <= 1)} aria-disabled={page <= 1}>
          <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t("previous")}
        </Link>
        <span className="tabular-nums">{t("pageOf", { page, pages })}</span>
        <Link href={hrefFor(page + 1)} className={linkClass(page >= pages)} aria-disabled={page >= pages}>
          {t("next")} <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
