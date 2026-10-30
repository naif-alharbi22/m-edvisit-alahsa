import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  const rows = [{ name: 'Ahmed "Abu" Ali', note: "line1\nline2", formula: "=SUM(A1)", n: 3, d: new Date("2026-01-02T03:04:05Z") }];
  const csv = toCsv(rows, [
    { header: "Name", value: (r) => r.name },
    { header: "Note", value: (r) => r.note },
    { header: "Formula", value: (r) => r.formula },
    { header: "N", value: (r) => r.n },
    { header: "Date", value: (r) => r.d },
    { header: "Empty", value: () => null },
  ]);

  it("starts with a UTF-8 BOM and uses CRLF", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")[0]).toBe("﻿Name,Note,Formula,N,Date,Empty");
  });

  it("quotes and escapes per RFC 4180 and neutralizes formulas", () => {
    const line = csv.slice(csv.indexOf("\r\n") + 2);
    expect(line).toContain('"Ahmed ""Abu"" Ali"');
    expect(line).toContain('"line1\nline2"');
    expect(line).toContain("'=SUM(A1)");
    expect(line).toContain("2026-01-02T03:04:05.000Z");
    expect(line.trimEnd().endsWith(",")).toBe(true);
  });
});
