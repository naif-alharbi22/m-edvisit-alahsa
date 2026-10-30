import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild>
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </main>
  );
}
