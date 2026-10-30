import { useTranslations } from "next-intl";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function UnassignedNotice() {
  const t = useTranslations("portal");
  return <EmptyState icon={UserX} title={t("unassigned")} className="py-24" />;
}
