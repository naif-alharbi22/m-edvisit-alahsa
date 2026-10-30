import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeUrgency } from "@/lib/status";
import { notify } from "./notifications";

export interface TriageAnalysis {
  findings: string[];
  recommendedSpecialty: string;
  urgency: string;
  summary: string;
  suggestedActions: string[];
  recommendedTests: string[];
}

export async function saveReport(
  userId: string,
  file: { name: string; type: string; size: number },
  analysis: TriageAnalysis,
  locale: string
) {
  const report = await prisma.medicalReport.create({
    data: {
      userId,
      fileName: file.name.slice(0, 200),
      fileType: file.type.slice(0, 100),
      fileSize: file.size,
      analysis: analysis as unknown as Prisma.InputJsonValue,
      specialty: analysis.recommendedSpecialty?.slice(0, 80) || null,
      urgency: normalizeUrgency(analysis.urgency),
      summary: analysis.summary?.slice(0, 2000) || null,
      status: "ANALYZED",
      locale,
    },
  });
  await notify(userId, "reportAnalyzed", { specialty: report.specialty ?? "" }, "/dashboard");
  return report;
}

export async function listPatientReports(userId: string, limit = 20) {
  return prisma.medicalReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
