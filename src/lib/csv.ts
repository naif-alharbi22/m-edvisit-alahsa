/** RFC 4180 CSV serialization with a UTF-8 BOM so Excel renders Arabic correctly. */
export type CsvValue = string | number | boolean | Date | null | undefined;

function escape(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let str = value instanceof Date ? value.toISOString() : String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => CsvValue }[]): string {
  const lines = [columns.map((c) => escape(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(c.value(row))).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
