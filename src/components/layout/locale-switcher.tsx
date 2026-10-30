"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const switchLocale = () => {
    const next = locale === "en" ? "ar" : "en";
    const query = searchParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
  };

  return (
    <Button variant="ghost" size="sm" onClick={switchLocale} className={className} title={t("language")}>
      <Globe className="h-3.5 w-3.5" aria-hidden />
      <span className="text-xs" lang={locale === "en" ? "ar" : "en"}>
        {locale === "en" ? "العربية" : "English"}
      </span>
    </Button>
  );
}
