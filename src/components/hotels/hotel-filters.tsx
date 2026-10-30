"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function HotelFilters({ facilities }: { facilities: { id: string; name: string; nameAr: string | null }[] }) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => update("q", search.trim() || null), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mb-6 flex flex-col flex-wrap gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("searchPlaceholder")} className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("searchPlaceholder")} />
        {pending && <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <Select value={searchParams.get("facility") ?? "any"} onValueChange={(v) => update("facility", v === "any" ? null : v)}>
        <SelectTrigger className="w-full lg:w-[260px]" aria-label={t("nearFacility")}>
          <SelectValue placeholder={t("nearFacility")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{t("anyFacility")}</SelectItem>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {t("nearFacility")}: {locale === "ar" && f.nameAr ? f.nameAr : f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={searchParams.get("minStars") ?? "any"} onValueChange={(v) => update("minStars", v === "any" ? null : v)}>
        <SelectTrigger className="w-full lg:w-[160px]" aria-label={t("minStars")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{t("anyStars")}</SelectItem>
          {[3, 4, 5].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t("starsOption", { count: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={searchParams.get("accessible") === "1"} onCheckedChange={(c) => update("accessible", c ? "1" : null)} aria-label={t("accessibleOnly")} />
        {t("accessibleOnly")}
      </label>
    </div>
  );
}
