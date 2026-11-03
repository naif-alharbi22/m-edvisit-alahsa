import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { routing } from "@/i18n/routing";
import { APP_TIME_ZONE } from "@/i18n/config";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Fonts are self-hosted so builds never depend on a third-party font CDN.
const plexArabic = localFont({
  variable: "--font-arabic",
  display: "swap",
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(appUrl),
    title: { default: t("common.appName"), template: `%s · ${t("common.appName")}` },
    description: t("hero.subtitle"),
    applicationName: t("common.appName"),
    alternates: { languages: { en: "/en", ar: "/ar" } },
    openGraph: {
      type: "website",
      siteName: t("common.appName"),
      title: `${t("hero.title")} ${t("hero.titleHighlight")}`,
      description: t("hero.subtitle"),
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#4a6fa5",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${GeistSans.variable} ${GeistMono.variable} ${plexArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={APP_TIME_ZONE}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
