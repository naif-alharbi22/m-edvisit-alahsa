"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, FlaskConical, Info, Stethoscope } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { StatusBadge } from "@/components/portal/status-badge";
import { normalizeUrgency } from "@/lib/status";

export interface Analysis {
  findings?: string[];
  recommendedSpecialty?: string;
  urgency?: string;
  summary?: string;
  suggestedActions?: string[];
  recommendedTests?: string[];
}

export function AnalysisResults({ analysis, saved }: { analysis: Analysis; saved?: boolean }) {
  const t = useTranslations("triage");
  const urgency = normalizeUrgency(analysis.urgency);
  const severe = urgency === "HIGH" || urgency === "EMERGENCY";

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("results")}</h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("saved")}
              </span>
            )}
            <StatusBadge kind="urgency" status={urgency} className={severe ? "animate-pulse" : ""} />
          </div>
        </div>
      </FadeIn>

      {urgency === "EMERGENCY" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t("disclaimer")}
        </div>
      )}

      {analysis.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
          </CardContent>
        </Card>
      )}

      {analysis.recommendedSpecialty && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Stethoscope className="h-4 w-4" /> {t("recommendedSpecialty")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">
              {analysis.recommendedSpecialty}
            </Badge>
          </CardContent>
        </Card>
      )}

      {analysis.findings && analysis.findings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" /> {t("findings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {analysis.findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {finding}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> {t("suggestedActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-1.5 text-sm marker:font-medium marker:text-primary">
              {analysis.suggestedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {analysis.recommendedTests && analysis.recommendedTests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FlaskConical className="h-4 w-4" /> {t("recommendedTests")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.recommendedTests.map((test, i) => (
              <Badge key={i} variant="outline">
                {test}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("disclaimer")}
      </p>

      {analysis.recommendedSpecialty && (
        <Button asChild className="w-full gap-2" size="lg">
          <Link href={`/facilities?specialty=${encodeURIComponent(analysis.recommendedSpecialty)}`}>
            {t("findFacilities")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      )}
    </div>
  );
}
