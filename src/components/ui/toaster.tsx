"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useLocale } from "next-intl";

export function Toaster() {
  const locale = useLocale();
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      dir={locale === "ar" ? "rtl" : "ltr"}
      toastOptions={{ className: "font-sans" }}
    />
  );
}
