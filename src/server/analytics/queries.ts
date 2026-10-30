import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_TIME_ZONE } from "@/i18n/config";
import type { Granularity, ResolvedRange } from "./time";

/**
 * SQL bucket expression for a timestamp column stored as UTC
 * (`timestamp without time zone`). Must match bucketKey() in time.ts.
 */
export function bucketExpr(columnSql: string, granularity: Granularity): Prisma.Sql {
  const format = granularity === "month" ? "YYYY-MM" : "YYYY-MM-DD";
  return Prisma.sql`to_char(date_trunc(${granularity}, (${Prisma.raw(columnSql)} AT TIME ZONE 'UTC') AT TIME ZONE ${APP_TIME_ZONE}), ${format})`;
}

export interface SeriesRow {
  bucket: string;
  value: number;
}

/**
 * Generic time series: aggregates `valueSql` over rows of `table` grouped by
 * bucket of `dateColumn`, restricted to the range and an optional extra filter.
 * Table/column names are internal constants, never user input.
 */
export async function timeSeries(opts: {
  table: string;
  dateColumn: string;
  range: ResolvedRange;
  valueSql?: string;
  where?: Prisma.Sql;
}): Promise<SeriesRow[]> {
  const col = `"${opts.dateColumn}"`;
  const value = Prisma.raw(opts.valueSql ?? "COUNT(*)");
  const extra = opts.where ? Prisma.sql`AND ${opts.where}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ bucket: string; value: number | string | null }[]>(Prisma.sql`
    SELECT ${bucketExpr(col, opts.range.granularity)} AS bucket, ${value} AS value
    FROM ${Prisma.raw(`"${opts.table}"`)}
    WHERE ${Prisma.raw(col)} >= ${opts.range.start} AND ${Prisma.raw(col)} < ${opts.range.end} ${extra}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({ bucket: r.bucket, value: Number(r.value ?? 0) }));
}
