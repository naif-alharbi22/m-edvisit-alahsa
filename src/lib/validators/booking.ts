import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/status";
import { isoDate, listQuerySchema, optionalId, optionalText } from "./common";
import { nightsBetween, parseDateOnly } from "@/lib/utils";

export const MAX_STAY_NIGHTS = 60;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const stayFields = {
  checkIn: isoDate,
  checkOut: isoDate,
  rooms: z.coerce.number().int().min(1).max(5).default(1),
};

function refineStay(v: { checkIn: string; checkOut: string }, ctx: z.RefinementCtx) {
  const checkIn = parseDateOnly(v.checkIn);
  const checkOut = parseDateOnly(v.checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  if (checkIn < todayUtc()) {
    ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Check-in cannot be in the past" });
  }
  if (nights < 1) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in" });
  }
  if (nights > MAX_STAY_NIGHTS) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: `Stays are limited to ${MAX_STAY_NIGHTS} nights` });
  }
}

export const availabilityQuerySchema = z.object(stayFields).superRefine(refineStay);
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createBookingSchema = z
  .object({
    ...stayFields,
    hotelId: z.string().min(1).max(64),
    roomTypeId: z.string().min(1).max(64),
    guests: z.coerce.number().int().min(1).max(20).default(1),
    appointmentId: optionalId,
    specialRequests: optionalText(1000),
  })
  .superRefine(refineStay);
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const managerUpdateBookingSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    managerNotes: optionalText(2000),
    cancelledReason: optionalText(500),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type ManagerUpdateBookingInput = z.infer<typeof managerUpdateBookingSchema>;

export const bookingListQuerySchema = listQuerySchema.extend({
  status: z.preprocess((v) => (v === "" || v === "ALL" ? undefined : v), z.enum(BOOKING_STATUSES).optional()),
  hotelId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(64).optional()),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
