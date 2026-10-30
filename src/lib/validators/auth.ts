import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { optionalText } from "./common";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email("Enter a valid email address").max(200)
);

const nationality = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.enum(COUNTRY_CODES).nullable().optional()
);

export const localeSchema = z.enum(["en", "ar"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: optionalText(30),
  nationality,
  locale: localeSchema.default("en"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: optionalText(30),
  nationality,
  locale: localeSchema,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  });
