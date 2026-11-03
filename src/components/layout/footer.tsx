import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WisalLogo } from "@/components/brand/wisal-logo";

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4">
              <WisalLogo alt={tc("appName")} className="h-14" />
            </div>
            <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">{t("services")}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/triage" className="hover:text-foreground">{tn("triage")}</Link></li>
              <li><Link href="/facilities" className="hover:text-foreground">{tn("facilities")}</Link></li>
              <li><Link href="/hotels" className="hover:text-foreground">{tn("hotels")}</Link></li>
              <li><Link href="/chat" className="hover:text-foreground">{tn("chat")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">{t("partners")}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">{t("partnerLogin")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">{t("contact")}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("region")}</li>
              <li>{t("country")}</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 space-y-1 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>&copy; {year} {tc("appName")}. {t("rights")}</p>
          <p>{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
