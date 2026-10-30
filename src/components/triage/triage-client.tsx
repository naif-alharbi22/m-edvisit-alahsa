"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, History, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/portal/status-badge";
import { FileUpload } from "./file-upload";
import { AnalysisResults, type Analysis } from "./analysis-results";
import { formatDate } from "@/lib/format";

export interface PastReport {
  id: string;
  fileName: string;
  specialty: string | null;
  urgency: string | null;
  createdAt: Date | string;
  analysis: Analysis | null;
}

export function TriageClient({ reports, isAuthenticated, maxMb }: { reports: PastReport[]; isAuthenticated: boolean; maxMb: number }) {
  const t = useTranslations("triage");
  const locale = useLocale();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locale", locale);
      const res = await fetch("/api/triage", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.details?.code ?? data?.code;
        if (res.status === 503) setError(t("errors.aiUnavailable"));
        else if (res.status === 429) setError(t("errors.rateLimited"));
        else if (code === "FILE_TOO_LARGE") setError(t("errors.fileTooLarge", { size: maxMb }));
        else if (code === "UNSUPPORTED_TYPE") setError(t("errors.unsupportedType"));
        else setError(t("errors.failed"));
        return;
      }
      setAnalysis(data.analysis);
      setSaved(Boolean(data.reportId));
    } catch {
      setError(t("errors.failed"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileUpload onFileSelect={handleFile} isAnalyzing={isAnalyzing} maxMb={maxMb} onError={setError} />

      {!isAuthenticated && (
        <p className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <LogIn className="h-4 w-4 shrink-0" />
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/${locale}/triage`)}`} className="text-primary hover:underline">
            {t("signInToSave")}
          </Link>
        </p>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {analysis ? (
        <AnalysisResults analysis={analysis} saved={saved} />
      ) : (
        !isAnalyzing &&
        reports.length > 0 && (
          <section className="space-y-3">
            <h2 className="mt-8 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" /> {t("previousReports")}
            </h2>
            {reports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => report.analysis && setAnalysis(report.analysis)}
                onKeyDown={(e) => e.key === "Enter" && report.analysis && setAnalysis(report.analysis)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <CardTitle className="truncate text-sm">{report.fileName}</CardTitle>
                    </div>
                    {report.urgency && <StatusBadge kind="urgency" status={report.urgency} />}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{report.specialty}</span>
                  <span>{formatDate(report.createdAt, locale)}</span>
                </CardContent>
              </Card>
            ))}
          </section>
        )
      )}
    </div>
  );
}
