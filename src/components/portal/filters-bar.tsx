"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface FiltersBarProps {
  statuses?: Option[];
  extraSelect?: { param: string; placeholder: string; options: Option[] };
  showDates?: boolean;
  exportUrl?: string;
}

/** One filter row above the content it scopes; state lives in the URL. */
export function FiltersBar({ statuses, extraSelect, showDates = true, exportUrl }: FiltersBarProps) {
  const t = useTranslations("portal");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const push = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  const exportHref = (() => {
    if (!exportUrl) return null;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const query = params.toString();
    return `${exportUrl}${query ? `${exportUrl.includes("?") ? "&" : "?"}${query}` : ""}`;
  })();

  const hasFilters = ["q", "status", "from", "to", extraSelect?.param].some((k) => k && searchParams.get(k));

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        push({ q: q.trim() || null, from: from || null, to: to || null });
      }}
    >
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="ps-9" aria-label={tc("search")} />
      </div>
      {statuses && (
        <Select value={searchParams.get("status") ?? "ALL"} onValueChange={(v) => push({ status: v === "ALL" ? null : v })}>
          <SelectTrigger className="w-[170px]" aria-label={tc("status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {extraSelect && (
        <Select value={searchParams.get(extraSelect.param) ?? "ALL"} onValueChange={(v) => push({ [extraSelect.param]: v === "ALL" ? null : v })}>
          <SelectTrigger className="w-[200px]" aria-label={extraSelect.placeholder}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{extraSelect.placeholder}</SelectItem>
            {extraSelect.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showDates && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("fromDate")}
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("toDate")}
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
          </label>
        </>
      )}
      <Button type="submit" variant="secondary">
        {t("applyFilters")}
      </Button>
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQ("");
            setFrom("");
            setTo("");
            router.push(pathname);
          }}
        >
          <X className="h-4 w-4" /> {t("clearFilters")}
        </Button>
      )}
      {exportHref && (
        <Button asChild variant="outline" className="ms-auto">
          <a href={exportHref} download>
            <Download className="h-4 w-4" /> {tc("export")}
          </a>
        </Button>
      )}
    </form>
  );
}
