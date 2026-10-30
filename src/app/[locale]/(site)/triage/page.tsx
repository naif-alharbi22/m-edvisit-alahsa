"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { FileUpload } from "@/components/triage/file-upload";
import { AnalysisResults } from "@/components/triage/analysis-results";
import { AnimatedPage } from "@/components/ui/animated-page";
import { FadeIn } from "@/components/ui/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, FileText, History } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface PastReport {
  id: string;
  fileName: string;
  specialty: string;
  status: string;
  date: string;
  analysis?: Record<string, unknown>;
}

export default function TriagePage() {
  const t = useTranslations("triage");
  const locale = useLocale();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locale", locale);

      const res = await fetch("/api/triage", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError("Failed to analyze report. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const demoReports: PastReport[] = [
    {
      id: "1",
      fileName: "blood-test-results.pdf",
      specialty: "Cardiology",
      status: "analyzed",
      date: "2026-04-20",
      analysis: {
        findings: ["Elevated cholesterol (280 mg/dL)", "Borderline high blood pressure (135/88)", "Vitamin D deficiency"],
        recommendedSpecialty: "Cardiology",
        urgency: "moderate",
        summary: "Patient shows elevated cholesterol levels and borderline hypertension. Cardiology consultation recommended.",
        suggestedActions: ["Cardiology consultation", "Diet modification", "Regular blood pressure monitoring"],
        recommendedTests: ["Lipid panel", "ECG", "Echocardiogram"],
      },
    },
  ];

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <FadeIn>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </FadeIn>

        <div className="space-y-6">
          <FadeIn delay={0.1}>
            <FileUpload onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
          </FadeIn>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {analysis ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AnalysisResults analysis={analysis} />
              </motion.div>
            ) : (
              !isAnalyzing && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mt-8">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Previous Reports</span>
                  </div>
                  <StaggerContainer staggerDelay={0.1}>
                    {demoReports.map((report) => (
                      <StaggerItem key={report.id}>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setAnalysis(report.analysis as Record<string, unknown>)}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <CardTitle className="text-sm">{report.fileName}</CardTitle>
                              </div>
                              <Badge variant="secondary">{report.specialty}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">{report.date}</p>
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedPage>
  );
}
