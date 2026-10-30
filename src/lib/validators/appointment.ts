import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/lib/status";
import { listQuerySchema, optionalId, optionalText } from "./common";

const MIN_LEAD_MS = 60 * 60 * 1000; // 1 hour
const MAX_AHEAD_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export const scheduledAtSchema = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), "Invalid date");

export const createAppointmentSchema = z
  .object({
    facilityId: z.string().min(1).max(64),
    doctorId: optionalId,
    packageId: optionalId,
    reportId: optionalId,
    specialty: optionalText(80),
    scheduledAt: scheduledAtSchema,
    notes: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    const now = Date.now();
    if (v.scheduledAt.getTime() < now + MIN_LEAD_MS) {
      ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Choose a time at least one hour from now" });
    }
    if (v.scheduledAt.getTime() > now + MAX_AHEAD_MS) {
      ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Appointments can be booked up to one year ahead" });
    }
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const staffUpdateAppointmentSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    scheduledAt: scheduledAtSchema.optional(),
    adminNotes: optionalText(2000),
    cancelledReason: optionalText(500),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type StaffUpdateAppointmentInput = z.infer<typeof staffUpdateAppointmentSchema>;

export const patientCancelSchema = z.object({
  reason: optionalText(500),
});

export const appointmentListQuerySchema = listQuerySchema.extend({
  status: z.preprocess((v) => (v === "" || v === "ALL" ? undefined : v), z.enum(APPOINTMENT_STATUSES).optional()),
  facilityId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(64).optional()),
});
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;
