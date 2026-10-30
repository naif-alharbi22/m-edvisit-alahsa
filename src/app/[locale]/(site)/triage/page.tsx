import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Stethoscope } from "lucide-react";
import { TriageClient, type PastReport } from "@/components/triage/triage-client";
import { getCurrentUser } from "@/lib/session";
import { listPatientReports } from "@/server/services/reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("triage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function TriagePage() {
  const [t, user] = await Promise.all([getTranslations("triage"), getCurrentUser()]);
  const reports = user ? await listPatientReports(user.id, 5) : [];
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TriageClient
        isAuthenticated={Boolean(user)}
        maxMb={Number(process.env.MAX_UPLOAD_MB ?? 10)}
        reports={reports.map(
          (r): PastReport => ({
            id: r.id,
            fileName: r.fileName,
            specialty: r.specialty,
            urgency: r.urgency,
            createdAt: r.createdAt,
            analysis: (r.analysis as PastReport["analysis"]) ?? null,
          })
        )}
      />
    </div>
  );
}
