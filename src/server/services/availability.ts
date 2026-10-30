/**
 * Pure inventory math (no database access) so it can be unit-tested and reused
 * by both the booking flow and analytics.
 */
const DAY_MS = 86_400_000;

export interface StayRange {
  checkIn: Date;
  checkOut: Date;
  rooms: number;
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Highest number of rooms occupied on any single night within [checkIn, checkOut). */
export function peakOccupancy(bookings: StayRange[], checkIn: Date, checkOut: Date): number {
  const start = utcDay(checkIn);
  const end = utcDay(checkOut);
  let peak = 0;
  for (let night = start; night < end; night += DAY_MS) {
    let occupied = 0;
    for (const b of bookings) {
      if (utcDay(b.checkIn) <= night && utcDay(b.checkOut) > night) occupied += b.rooms;
    }
    if (occupied > peak) peak = occupied;
  }
  return peak;
}

/** Rooms still bookable for every night of the stay. */
export function availableRooms(totalRooms: number, bookings: StayRange[], checkIn: Date, checkOut: Date): number {
  return Math.max(0, totalRooms - peakOccupancy(bookings, checkIn, checkOut));
}

/** Number of nights of `stay` that fall inside [rangeStart, rangeEnd). */
export function overlapNights(stay: { checkIn: Date; checkOut: Date }, rangeStart: Date, rangeEnd: Date): number {
  const start = Math.max(utcDay(stay.checkIn), utcDay(rangeStart));
  const end = Math.min(utcDay(stay.checkOut), utcDay(rangeEnd));
  return Math.max(0, Math.round((end - start) / DAY_MS));
}
