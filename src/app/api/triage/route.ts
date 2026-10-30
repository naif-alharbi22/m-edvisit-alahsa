import { NextResponse } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { clientIp, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getOpenAI, TRIAGE_MODEL, triageSystemPrompt } from "@/lib/openai";
import { parseTriageResponse, sniffMimeType, TRIAGE_MIME_TYPES } from "@/lib/triage";
import { getCurrentUser } from "@/lib/session";
import { logger } from "@/lib/logger";
import { BadRequestError, ServiceUnavailableError } from "@/server/errors";
import { listSpecialties } from "@/server/services/facilities";
import { saveReport } from "@/server/services/reports";

export const maxDuration = 60;

export const POST = withErrorHandling(async (req) => {
  const user = await getCurrentUser();
  enforceRateLimit("triage", user?.id ?? clientIp(req));
  const openai = getOpenAI();

  // Reject oversized uploads before buffering the body into memory.
  const maxBytes = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 64 * 1024) {
    return NextResponse.json({ error: "File is too large", code: "BAD_REQUEST", details: { code: "FILE_TOO_LARGE" } }, { status: 413 });
  }

  const formData = await req.formData().catch(() => {
    throw new BadRequestError("Expected multipart form data");
  });
  const file = formData.get("file");
  const locale = formData.get("locale") === "ar" ? "ar" : "en";
  if (!(file instanceof File) || file.size === 0) throw new BadRequestError("No file provided");

  if (file.size > maxBytes) throw new BadRequestError("File is too large", { code: "FILE_TOO_LARGE" });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMimeType(bytes);
  if (!mime || !(TRIAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new BadRequestError("Unsupported file type", { code: "UNSUPPORTED_TYPE" });
  }

  const dataUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  const filePart: ChatCompletionContentPart =
    mime === "application/pdf"
      ? { type: "file", file: { filename: file.name || "report.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl, detail: "high" } };

  const specialties = await listSpecialties();
  let content: string | null | undefined;
  try {
    const response = await openai.chat.completions.create(
      {
        model: TRIAGE_MODEL(),
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500,
        messages: [
          { role: "system", content: triageSystemPrompt(locale, specialties) },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: locale === "ar" ? "يرجى تحليل هذا المستند الطبي." : "Please analyze this medical document.",
              },
              filePart,
            ],
          },
        ],
      },
      { signal: req.signal }
    );
    content = response.choices[0]?.message?.content;
  } catch (err) {
    logger.error("Triage model call failed", { err });
    throw new ServiceUnavailableError("AI analysis failed, please try again");
  }
  if (!content) throw new ServiceUnavailableError("No analysis was generated");

  const analysis = parseTriageResponse(content);
  let reportId: string | null = null;
  if (user) {
    const report = await saveReport(user.id, { name: file.name, type: mime, size: file.size }, analysis, locale);
    reportId = report.id;
  }
  return NextResponse.json({ analysis, reportId });
});
