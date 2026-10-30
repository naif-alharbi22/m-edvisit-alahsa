import { z } from "zod";

export const TRIAGE_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type TriageMimeType = (typeof TRIAGE_MIME_TYPES)[number];

/** Detects the real file type from magic bytes (never trust the client-provided MIME type). */
export function sniffMimeType(bytes: Uint8Array): TriageMimeType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

const stringArray = z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []),
  z.array(z.coerce.string().trim().max(500)).max(20)
);

export const triageAnalysisSchema = z.object({
  findings: stringArray,
  recommendedSpecialty: z.coerce.string().trim().max(80).catch("General Medicine"),
  urgency: z.preprocess((v) => String(v ?? "").toLowerCase(), z.enum(["low", "moderate", "high", "emergency"]).catch("low")),
  summary: z.coerce.string().trim().max(3000).catch(""),
  suggestedActions: stringArray,
  recommendedTests: stringArray,
});

export type ParsedTriageAnalysis = z.infer<typeof triageAnalysisSchema>;

/** Parses model output into a validated analysis, tolerating extra text around the JSON. */
export function parseTriageResponse(content: string): ParsedTriageAnalysis {
  let raw: unknown = {};
  try {
    raw = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        raw = JSON.parse(match[0]);
      } catch {
        raw = {};
      }
    }
  }
  const parsed = triageAnalysisSchema.safeParse(raw);
  if (parsed.success && (parsed.data.summary || parsed.data.findings.length)) return parsed.data;
  return {
    findings: [],
    recommendedSpecialty: "General Medicine",
    urgency: "low",
    summary: content.slice(0, 3000),
    suggestedActions: [],
    recommendedTests: [],
  };
}
