/**
 * Status vocabularies and allowed transitions. Shared by services (to enforce)
 * and UI (to decide which action buttons to show).
 */
export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] as const;
export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const URGENCY_LEVELS = ["LOW", "MODERATE", "HIGH", "EMERGENCY"] as const;
export type UrgencyValue = (typeof URGENCY_LEVELS)[number];

export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatusValue, readonly AppointmentStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const BOOKING_TRANSITIONS: Record<BookingStatusValue, readonly BookingStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
};

export function canTransitionAppointment(from: AppointmentStatusValue, to: AppointmentStatusValue): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionBooking(from: BookingStatusValue, to: BookingStatusValue): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/** Appointments in these states still hold a slot / count as active demand. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatusValue[] = ["PENDING", "CONFIRMED"];

/** Bookings in these states consume room inventory. */
export const INVENTORY_BOOKING_STATUSES: BookingStatusValue[] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

/** Bookings in these states are counted as realised/committed revenue. */
export const REVENUE_BOOKING_STATUSES: BookingStatusValue[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

export function normalizeUrgency(value: unknown): UrgencyValue {
  const v = String(value ?? "").toUpperCase();
  return (URGENCY_LEVELS as readonly string[]).includes(v) ? (v as UrgencyValue) : "LOW";
}
