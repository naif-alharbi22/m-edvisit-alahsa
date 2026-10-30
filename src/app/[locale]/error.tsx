"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("genericTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("genericBody")}</p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">{error.digest}</p>}
      <Button onClick={reset}>{tc("retry")}</Button>
    </main>
  );
}
