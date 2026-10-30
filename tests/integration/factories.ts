import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";

export const PASSWORD = "Passw0rd!";
let passwordHash: string | null = null;
const uid = () => randomUUID().slice(0, 8);

export async function createUser(role: AppRole = "PATIENT", extra: { facilityId?: string; hotelId?: string; nationality?: string } = {}) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4);
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${uid()}@test.local`,
      name: `${role} ${uid()}`,
      password: passwordHash,
      role,
      nationality: extra.nationality ?? "KW",
      facilityId: extra.facilityId ?? null,
      hotelId: extra.hotelId ?? null,
    },
  });
}

export async function createFacility(overrides: Partial<{ name: string; latitude: number; longitude: number; isActive: boolean }> = {}) {
  const name = overrides.name ?? `Test Hospital ${uid()}`;
  return prisma.facility.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${uid()}`,
      specialties: ["Cardiology", "Orthopedics"],
      latitude: overrides.latitude ?? 25.38,
      longitude: overrides.longitude ?? 49.59,
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createDoctor(facilityId: string, specialty = "Cardiology", fee = 400) {
  return prisma.doctor.create({ data: { facilityId, name: `Dr. ${uid()}`, specialty, consultationFee: fee, languages: ["Arabic"] } });
}

export async function createPackage(facilityId: string, specialty = "Orthopedics", price = 18000) {
  return prisma.treatmentPackage.create({ data: { facilityId, name: `Package ${uid()}`, specialty, price } });
}

export async function createHotel(overrides: Partial<{ latitude: number; longitude: number }> = {}) {
  return prisma.hotel.create({
    data: {
      name: `Test Hotel ${uid()}`,
      slug: `test-hotel-${uid()}`,
      starRating: 4,
      amenities: ["WiFi"],
      latitude: overrides.latitude ?? 25.381,
      longitude: overrides.longitude ?? 49.59,
    },
  });
}

export async function createRoomType(hotelId: string, totalRooms = 2, pricePerNight = 500) {
  return prisma.roomType.create({ data: { hotelId, name: `Room ${uid()}`, capacity: 2, pricePerNight, totalRooms, amenities: [] } });
}

/** YYYY-MM-DD for today + offset days (Riyadh calendar). */
export function isoDay(offset: number) {
  return new Date(Date.now() + 3 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
}

/** An instant N days from now at 10:00 Riyadh time. */
export function futureAt(days: number, hourLocal = 10) {
  return new Date(`${isoDay(days)}T${String(hourLocal).padStart(2, "0")}:00:00+03:00`);
}
