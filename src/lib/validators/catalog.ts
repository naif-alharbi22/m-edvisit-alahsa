import { z } from "zod";
import { optionalEmail, optionalNumber, optionalText, optionalUrl, stringList } from "./common";

export const FACILITY_TYPES = ["HOSPITAL", "CLINIC", "MEDICAL_CENTER"] as const;

export const facilityInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  nameAr: optionalText(150),
  type: z.enum(FACILITY_TYPES).default("HOSPITAL"),
  description: optionalText(3000),
  descriptionAr: optionalText(3000),
  city: z.string().trim().min(2).max(80).default("Al-Ahsa"),
  address: optionalText(300),
  phone: optionalText(30),
  email: optionalEmail,
  website: optionalUrl,
  image: optionalUrl,
  specialties: stringList(40),
  accreditations: stringList(20),
  latitude: optionalNumber(z.number().min(-90).max(90)),
  longitude: optionalNumber(z.number().min(-180).max(180)),
  isActive: z.boolean().default(true),
});
export type FacilityInput = z.infer<typeof facilityInputSchema>;

/** Hospital admins may edit their profile but not activation status. */
export const facilityProfileSchema = facilityInputSchema.omit({ isActive: true });

export const doctorInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameAr: optionalText(120),
  specialty: z.string().trim().min(2).max(80),
  title: optionalText(80),
  image: optionalUrl,
  yearsExp: z.coerce.number().int().min(0).max(70).default(0),
  languages: stringList(10, 40),
  bio: optionalText(2000),
  bioAr: optionalText(2000),
  consultationFee: optionalNumber(z.number().min(0).max(1_000_000)),
  isActive: z.boolean().default(true),
});
export type DoctorInput = z.infer<typeof doctorInputSchema>;

export const packageInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  nameAr: optionalText(150),
  description: optionalText(2000),
  descriptionAr: optionalText(2000),
  specialty: z.string().trim().min(2).max(80),
  price: z.coerce.number().min(0).max(10_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("SAR"),
  duration: optionalText(60),
  includes: stringList(30, 120),
  isActive: z.boolean().default(true),
});
export type PackageInput = z.infer<typeof packageInputSchema>;

export const hotelInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  nameAr: optionalText(150),
  description: optionalText(3000),
  descriptionAr: optionalText(3000),
  city: z.string().trim().min(2).max(80).default("Al-Ahsa"),
  address: optionalText(300),
  phone: optionalText(30),
  email: optionalEmail,
  website: optionalUrl,
  image: optionalUrl,
  starRating: z.coerce.number().int().min(1).max(5).default(3),
  amenities: stringList(40),
  latitude: optionalNumber(z.number().min(-90).max(90)),
  longitude: optionalNumber(z.number().min(-180).max(180)),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("14:00"),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("12:00"),
  isActive: z.boolean().default(true),
});
export type HotelInput = z.infer<typeof hotelInputSchema>;

export const hotelProfileSchema = hotelInputSchema.omit({ isActive: true });

export const roomTypeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameAr: optionalText(120),
  description: optionalText(2000),
  descriptionAr: optionalText(2000),
  capacity: z.coerce.number().int().min(1).max(12).default(2),
  bedType: optionalText(60),
  sizeSqm: optionalNumber(z.number().int().min(5).max(2000)),
  pricePerNight: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("SAR"),
  totalRooms: z.coerce.number().int().min(0).max(5000),
  amenities: stringList(30),
  accessible: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type RoomTypeInput = z.infer<typeof roomTypeInputSchema>;

export const reviewInputSchema = z
  .object({
    facilityId: z.string().max(64).optional(),
    hotelId: z.string().max(64).optional(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: optionalText(1000),
  })
  .refine((v) => Boolean(v.facilityId) !== Boolean(v.hotelId), "Review either a facility or a hotel");
export type ReviewInput = z.infer<typeof reviewInputSchema>;
