/**
 * Chart color roles (validated reference palette — see the dataviz method).
 * Values are CSS variables defined in globals.css so dark mode can re-step them.
 * Categorical slots are assigned in fixed order and follow the entity.
 */
export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** "Other" / de-emphasis bucket. */
export const MUTED_SERIES = "var(--chart-muted)";

export const STATUS_COLOR = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
} as const;

// Lifecycle order matches slot order so adjacent segments stay CVD-separable.
export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: SERIES[0],
  CONFIRMED: SERIES[1],
  COMPLETED: SERIES[2],
  NO_SHOW: SERIES[3],
  CANCELLED: SERIES[4],
};
export const APPOINTMENT_STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: SERIES[0],
  CONFIRMED: SERIES[1],
  CHECKED_IN: SERIES[2],
  CHECKED_OUT: SERIES[3],
  CANCELLED: SERIES[4],
};

/** Urgency is a severity scale, so it uses the reserved status colors (always with labels). */
export const URGENCY_COLORS: Record<string, string> = {
  LOW: STATUS_COLOR.good,
  MODERATE: STATUS_COLOR.warning,
  HIGH: STATUS_COLOR.serious,
  EMERGENCY: STATUS_COLOR.critical,
};
export const URGENCY_ORDER = ["LOW", "MODERATE", "HIGH", "EMERGENCY"] as const;

/** Label ink inside a filled segment: near-black on yellow/warning, white otherwise. */
export function inkOn(color: string): string {
  return color === SERIES[3] || color === STATUS_COLOR.warning ? "#0b0b0b" : "#ffffff";
}
