import { describe, expect, it } from "vitest";
import { parseTriageResponse, sniffMimeType } from "@/lib/triage";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("sniffMimeType", () => {
  it("detects real file types from magic bytes", () => {
    expect(sniffMimeType(bytes(0x25, 0x50, 0x44, 0x46))).toBe("application/pdf");
    expect(sniffMimeType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMimeType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });

  it("rejects disguised files", () => {
    expect(sniffMimeType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffMimeType(bytes(0x4d, 0x5a))).toBeNull(); // Windows executable
  });
});

describe("parseTriageResponse", () => {
  it("parses clean JSON and normalizes fields", () => {
    const r = parseTriageResponse(
      JSON.stringify({ findings: "Single finding", recommendedSpecialty: "Cardiology", urgency: "HIGH", summary: "S", suggestedActions: [], recommendedTests: ["ECG"] })
    );
    expect(r.findings).toEqual(["Single finding"]);
    expect(r.urgency).toBe("high");
    expect(r.recommendedTests).toEqual(["ECG"]);
  });

  it("extracts JSON surrounded by prose and repairs bad urgency", () => {
    const r = parseTriageResponse('Here you go:\n{"summary":"ok","findings":["a"],"urgency":"critical"}\nThanks');
    expect(r.summary).toBe("ok");
    expect(r.urgency).toBe("low");
    expect(r.recommendedSpecialty).toBe("General Medicine");
  });

  it("falls back to using the text as the summary", () => {
    const r = parseTriageResponse("The document is not readable.");
    expect(r.summary).toBe("The document is not readable.");
    expect(r.findings).toEqual([]);
  });
});
