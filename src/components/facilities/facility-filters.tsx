"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FacilityFilters({ specialties }: { specialties: string[] }) {
  const t = useTranslations("facilities");
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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("searchPlaceholder")} className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("searchPlaceholder")} />
        {pending && <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <Select value={searchParams.get("specialty") ?? "all"} onValueChange={(v) => update("specialty", v === "all" ? null : v)}>
        <SelectTrigger className="w-full sm:w-[220px]" aria-label={t("filterSpecialty")}>
          <SelectValue placeholder={t("filterSpecialty")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allSpecialties")}</SelectItem>
          {specialties.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
