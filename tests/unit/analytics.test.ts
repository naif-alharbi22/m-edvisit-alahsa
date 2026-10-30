import { describe, expect, it } from "vitest";
import { computeOccupancy, fillSeries, occupancySeries, percentChange, rate, topWithOther } from "@/server/analytics/compute";
import { bucketKey, localDateOnly, localToday, resolveRange } from "@/server/analytics/time";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
/** Local (UTC+3) midnight of a calendar date as a UTC instant. */
const localMidnight = (s: string) => new Date(d(s).getTime() - 3 * 3_600_000);

describe("bucketKey (Asia/Riyadh)", () => {
  it("uses the local calendar day", () => {
    expect(bucketKey(new Date("2026-10-30T20:59:00Z"), "day")).toBe("2026-10-30");
    expect(bucketKey(new Date("2026-10-30T21:00:00Z"), "day")).toBe("2026-10-31");
  });

  it("keys weeks by their Monday and months by year-month", () => {
    expect(bucketKey(new Date("2026-10-30T10:00:00Z"), "week")).toBe("2026-10-26"); // Friday → Monday
    expect(bucketKey(new Date("2026-10-26T00:00:00Z"), "week")).toBe("2026-10-26");
    expect(bucketKey(new Date("2026-10-31T22:00:00Z"), "month")).toBe("2026-11");
  });
});

describe("resolveRange", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("builds 30 daily buckets ending today", () => {
    const r = resolveRange("30d", now);
    expect(r.granularity).toBe("day");
    expect(r.buckets).toHaveLength(30);
    expect(r.buckets.at(-1)!.key).toBe("2026-10-30");
    expect(r.end.toISOString()).toBe("2026-10-30T21:00:00.000Z");
    expect(r.prevEnd).toEqual(r.start);
    expect(r.prevEnd.getTime() - r.prevStart.getTime()).toBe(r.end.getTime() - r.start.getTime());
  });

  it("builds 13 weekly and 12 monthly buckets", () => {
    const w = resolveRange("90d", now);
    expect(w.buckets).toHaveLength(13);
    expect(w.buckets.at(-1)!.key).toBe("2026-10-26");
    const m = resolveRange("12m", now);
    expect(m.buckets).toHaveLength(12);
    expect(m.buckets[0]!.key).toBe("2025-11");
    expect(m.buckets.at(-1)!.key).toBe("2026-10");
  });

  it("produces contiguous buckets", () => {
    const r = resolveRange("90d", now);
    for (let i = 1; i < r.buckets.length; i++) expect(r.buckets[i]!.start).toEqual(r.buckets[i - 1]!.end);
  });
});

describe("local day helpers", () => {
  it("shifts to Riyadh before taking the date", () => {
    const late = new Date("2026-10-30T22:30:00Z");
    expect(localDateOnly(late).toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(localToday(late).start.toISOString()).toBe("2026-10-30T21:00:00.000Z");
  });
});

describe("computeOccupancy", () => {
  const stays = [
    { checkIn: d("2026-11-01"), checkOut: d("2026-11-04"), rooms: 1, nightlyRate: 500 },
    { checkIn: d("2026-11-02"), checkOut: d("2026-11-03"), rooms: 2, nightlyRate: 300 },
  ];

  it("computes occupancy, ADR and RevPAR over room-nights", () => {
    const r = computeOccupancy(10, stays, localMidnight("2026-11-01"), localMidnight("2026-11-05"));
    expect(r.availableRoomNights).toBe(40);
    expect(r.soldRoomNights).toBe(5);
    expect(r.revenue).toBe(2100);
    expect(r.occupancy).toBe(0.125);
    expect(r.adr).toBe(420);
    expect(r.revpar).toBe(52.5);
  });

  it("caps occupancy at 100% when inventory was reduced", () => {
    expect(computeOccupancy(1, stays, localMidnight("2026-11-02"), localMidnight("2026-11-03")).occupancy).toBe(1);
  });

  it("handles empty inventory", () => {
    const r = computeOccupancy(0, [], localMidnight("2026-11-01"), localMidnight("2026-11-02"));
    expect(r).toMatchObject({ occupancy: 0, adr: 0, revpar: 0 });
  });

  it("truncates buckets at the cap", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    const range = resolveRange("30d", now);
    const series = occupancySeries(10, stays, range.buckets, localToday(now).end);
    expect(series.at(-1)!.soldRoomNights).toBe(3); // night of Nov 2: 1 + 2 rooms
  });
});

describe("percentChange / rate / topWithOther / fillSeries", () => {
  it("reports null for a zero baseline", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(15, 10)).toBe(0.5);
    expect(percentChange(5, 10)).toBe(-0.5);
  });

  it("guards division by zero", () => {
    expect(rate(1, 0)).toBe(0);
    expect(rate(1, 3)).toBe(0.3333);
  });

  it("folds the tail into Other", () => {
    const out = topWithOther(
      [
        { label: "a", value: 1 },
        { label: "b", value: 5 },
        { label: "c", value: 3 },
        { label: "d", value: 2 },
      ],
      2
    );
    expect(out).toEqual([
      { label: "b", value: 5 },
      { label: "c", value: 3 },
      { label: "__other__", value: 3 },
    ]);
  });

  it("fills missing buckets with zeros", () => {
    const buckets = resolveRange("30d", new Date("2026-10-30T12:00:00Z")).buckets.slice(-3);
    expect(fillSeries(buckets, [{ bucket: "2026-10-29", value: 4 }]).map((x) => x.value)).toEqual([0, 4, 0]);
  });
});
