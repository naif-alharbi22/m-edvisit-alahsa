import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  BOOKING_STATUSES,
  canTransitionAppointment,
  canTransitionBooking,
  normalizeUrgency,
} from "@/lib/status";

describe("appointment transitions", () => {
  it("allows the clinical lifecycle", () => {
    expect(canTransitionAppointment("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionAppointment("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransitionAppointment("CONFIRMED", "NO_SHOW")).toBe(true);
    expect(canTransitionAppointment("PENDING", "CANCELLED")).toBe(true);
  });

  it("rejects skipping confirmation or reopening terminal states", () => {
    expect(canTransitionAppointment("PENDING", "COMPLETED")).toBe(false);
    for (const terminal of ["COMPLETED", "CANCELLED", "NO_SHOW"] as const) {
      for (const to of APPOINTMENT_STATUSES) expect(canTransitionAppointment(terminal, to)).toBe(false);
    }
  });

  it("defines transitions for every status", () => {
    expect(Object.keys(APPOINTMENT_TRANSITIONS).sort()).toEqual([...APPOINTMENT_STATUSES].sort());
  });
});

describe("booking transitions", () => {
  it("follows confirm → check-in → check-out", () => {
    expect(canTransitionBooking("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionBooking("CONFIRMED", "CHECKED_IN")).toBe(true);
    expect(canTransitionBooking("CHECKED_IN", "CHECKED_OUT")).toBe(true);
  });

  it("does not allow cancelling a guest who is in house or reopening", () => {
    expect(canTransitionBooking("CHECKED_IN", "CANCELLED")).toBe(false);
    expect(canTransitionBooking("PENDING", "CHECKED_IN")).toBe(false);
    for (const to of BOOKING_STATUSES) expect(canTransitionBooking("CHECKED_OUT", to)).toBe(false);
  });
});

describe("normalizeUrgency", () => {
  it("maps model output to the enum and defaults to LOW", () => {
    expect(normalizeUrgency("high")).toBe("HIGH");
    expect(normalizeUrgency("Emergency")).toBe("EMERGENCY");
    expect(normalizeUrgency("critical!!")).toBe("LOW");
    expect(normalizeUrgency(undefined)).toBe("LOW");
  });
});
