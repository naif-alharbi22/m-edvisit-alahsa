import { z } from "zod";
import { ROLES } from "@/lib/roles";
import { emailSchema, passwordSchema } from "./auth";
import { listQuerySchema, optionalId } from "./common";

function refineAssignment(v: { role?: string; facilityId?: string | null; hotelId?: string | null }, ctx: z.RefinementCtx) {
  if (v.role === "HOSPITAL_ADMIN" && !v.facilityId) {
    ctx.addIssue({ code: "custom", path: ["facilityId"], message: "Hospital admins must be assigned to a facility" });
  }
  if (v.role === "HOTEL_MANAGER" && !v.hotelId) {
    ctx.addIssue({ code: "custom", path: ["hotelId"], message: "Hotel managers must be assigned to a hotel" });
  }
}

export const adminCreateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(ROLES),
    facilityId: optionalId,
    hotelId: optionalId,
  })
  .superRefine(refineAssignment);
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(ROLES).optional(),
    facilityId: optionalId,
    hotelId: optionalId,
    isActive: z.boolean().optional(),
  })
  .superRefine(refineAssignment);
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const userListQuerySchema = listQuerySchema.extend({
  role: z.preprocess((v) => (v === "" || v === "ALL" ? undefined : v), z.enum(ROLES).optional()),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
