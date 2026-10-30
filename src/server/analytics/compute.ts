/** Pure analytics calculations shared by all dashboards (unit-tested). */
import { overlapNights } from "@/server/services/availability";
import { instantToDateOnly, type Bucket } from "./time";

export interface RevenueStay {
  checkIn: Date;
  checkOut: Date;
  rooms: number;
  nightlyRate: number;
}

export interface OccupancyResult {
  availableRoomNights: number;
  soldRoomNights: number;
  revenue: number;
  occupancy: number;
  adr: number;
  revpar: number;
}

/**
 * Room-night occupancy and revenue for stays within [start, end), where start
 * and end are local-midnight instants. `roomsAvailable` is the nightly inventory.
 */
export function computeOccupancy(roomsAvailable: number, stays: RevenueStay[], start: Date, end: Date): OccupancyResult {
  const startDate = instantToDateOnly(start);
  const endDate = instantToDateOnly(end);
  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const availableRoomNights = roomsAvailable * nights;
  let soldRoomNights = 0;
  let revenue = 0;
  for (const s of stays) {
    const n = overlapNights(s, startDate, endDate) * s.rooms;
    soldRoomNights += n;
    revenue += n * s.nightlyRate;
  }
  // Inventory can be reduced after bookings were taken; never report > 100%.
  const occupancy = availableRoomNights > 0 ? Math.min(1, soldRoomNights / availableRoomNights) : 0;
  return {
    availableRoomNights,
    soldRoomNights,
    revenue: round2(revenue),
    occupancy: round4(occupancy),
    adr: soldRoomNights > 0 ? round2(revenue / soldRoomNights) : 0,
    revpar: availableRoomNights > 0 ? round2(revenue / availableRoomNights) : 0,
  };
}

/** Occupancy per bucket; buckets ending after `cap` are truncated at `cap` (e.g. tomorrow). */
export function occupancySeries(roomsAvailable: number, stays: RevenueStay[], buckets: Bucket[], cap?: Date) {
  return buckets.map((b) => {
    const end = cap && b.end > cap ? cap : b.end;
    const r = end > b.start ? computeOccupancy(roomsAvailable, stays, b.start, end) : computeOccupancy(roomsAvailable, [], b.start, b.start);
    return { key: b.key, occupancy: r.occupancy, revenue: r.revenue, soldRoomNights: r.soldRoomNights };
  });
}

/** Relative change; null when the previous value is zero (rendered as "New"). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round4((current - previous) / previous);
}

export function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? round4(numerator / denominator) : 0;
}

/** Keeps the top N entries by value and folds the remainder into a single "other" entry. */
export function topWithOther<T extends { label: string; value: number }>(entries: T[], n: number, otherLabel = "__other__") {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, n).map((e) => ({ label: e.label, value: e.value }));
  const rest = sorted.slice(n).reduce((s, e) => s + e.value, 0);
  if (rest > 0) top.push({ label: otherLabel, value: rest });
  return top;
}

/** Fills missing bucket keys with zero. */
export function fillSeries(buckets: Bucket[], rows: { bucket: string; value: number }[]): { key: string; value: number }[] {
  const map = new Map(rows.map((r) => [r.bucket, Number(r.value)]));
  return buckets.map((b) => ({ key: b.key, value: map.get(b.key) ?? 0 }));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}
