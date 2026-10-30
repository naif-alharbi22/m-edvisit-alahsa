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

/** Accepts a string (or number); anything missing/null becomes the fallback — never the text "undefined". */
const text = (max: number, fallback: string) =>
  z
    .preprocess((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback), z.string().trim().max(max))
    .catch(fallback);

/** Accepts an array of strings or a single string; drops non-text items. */
const stringArray = z.preprocess(
  (v) => {
    const arr = Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v] : [];
    return arr
      .filter((x) => typeof x === "string" || typeof x === "number")
      .map((x) => String(x).trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, 20);
  },
  z.array(z.string())
);

export const triageAnalysisSchema = z.object({
  findings: stringArray,
  recommendedSpecialty: text(80, "General Medicine").transform((v) => v || "General Medicine"),
  urgency: z.preprocess((v) => String(v ?? "").toLowerCase(), z.enum(["low", "moderate", "high", "emergency"]).catch("low")),
  summary: text(3000, ""),
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
