import { describe, expect, it } from "vitest";
import { availableRooms, overlapNights, peakOccupancy } from "@/server/services/availability";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("peakOccupancy", () => {
  const bookings = [
    { checkIn: d("2026-11-01"), checkOut: d("2026-11-04"), rooms: 1 }, // nights 1,2,3
    { checkIn: d("2026-11-03"), checkOut: d("2026-11-05"), rooms: 2 }, // nights 3,4
    { checkIn: d("2026-11-04"), checkOut: d("2026-11-06"), rooms: 1 }, // nights 4,5
  ];

  it("finds the busiest night within the stay", () => {
    expect(peakOccupancy(bookings, d("2026-11-01"), d("2026-11-03"))).toBe(1);
    expect(peakOccupancy(bookings, d("2026-11-03"), d("2026-11-04"))).toBe(3);
    expect(peakOccupancy(bookings, d("2026-11-04"), d("2026-11-06"))).toBe(3);
  });

  it("treats check-out day as free (back-to-back stays do not overlap)", () => {
    expect(peakOccupancy([{ checkIn: d("2026-11-01"), checkOut: d("2026-11-03"), rooms: 1 }], d("2026-11-03"), d("2026-11-05"))).toBe(0);
  });
});

describe("availableRooms", () => {
  it("subtracts the peak from inventory and never goes negative", () => {
    const stays = [{ checkIn: d("2026-11-01"), checkOut: d("2026-11-03"), rooms: 3 }];
    expect(availableRooms(5, stays, d("2026-11-01"), d("2026-11-02"))).toBe(2);
    expect(availableRooms(2, stays, d("2026-11-01"), d("2026-11-02"))).toBe(0);
    expect(availableRooms(5, stays, d("2026-11-03"), d("2026-11-04"))).toBe(5);
  });
});

describe("overlapNights", () => {
  it("counts nights inside the window", () => {
    const stay = { checkIn: d("2026-10-29"), checkOut: d("2026-11-03") };
    expect(overlapNights(stay, d("2026-11-01"), d("2026-12-01"))).toBe(2);
    expect(overlapNights(stay, d("2026-10-01"), d("2026-11-01"))).toBe(3);
    expect(overlapNights(stay, d("2026-12-01"), d("2026-12-31"))).toBe(0);
  });
});
