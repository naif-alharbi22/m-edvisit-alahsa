/**
 * Demo data seed.
 *
 *   npm run db:seed            # seeds only when the database has no users
 *   npm run db:seed -- --reset # wipes all data and reseeds
 *
 * Generates a deterministic year of platform activity relative to "today" so
 * every dashboard and analytics view has meaningful data out of the box.
 * All demo accounts share the password in SEED_PASSWORD (default below).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  FACILITIES,
  HOTELS,
  NATIONALITY_WEIGHTS,
  FIRST_NAMES,
  LAST_NAMES,
  URGENCY_WEIGHTS,
  REPORT_FILES,
  REVIEW_COMMENTS,
  type SeedFacility,
  type SeedHotel,
} from "./seed-data";

type SeededFacility = Prisma.FacilityGetPayload<{ include: { doctors: true; treatmentPackages: true } }> & {
  seed: SeedFacility;
};
type SeededHotel = Prisma.HotelGetPayload<{ include: { roomTypes: true } }> & { seed: SeedHotel };

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = process.env.SEED_PASSWORD || "MedVisit@2026";
const DAY = 86_400_000;

// ─── Deterministic PRNG (mulberry32) ────────────────────────────────────────
let rngState = 0x5eed1234;
function rand(): number {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
function weighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const usedRefs = new Set<string>();
function reference(prefix: "AP" | "HB"): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i++) code += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length)];
    const ref = `${prefix}-${code}`;
    if (!usedRefs.has(ref)) {
      usedRefs.add(ref);
      return ref;
    }
  }
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const daysFromToday = (n: number) => new Date(today.getTime() + n * DAY);
/** A clinic time between 08:00 and 16:30 (Asia/Riyadh = UTC+3) on the given day. */
function clinicTime(day: Date): Date {
  const hourLocal = randInt(8, 16);
  const minute = pick([0, 15, 30, 45]);
  return new Date(day.getTime() + (hourLocal - 3) * 3_600_000 + minute * 60_000);
}

async function wipe() {
  // Order matters for FK constraints.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.hotelBooking.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.user.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.treatmentPackage.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.facility.deleteMany();
}

async function main() {
  const reset = process.argv.includes("--reset");
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && !reset) {
    console.log(`Database already contains ${existingUsers} users — skipping seed (use --reset to reseed).`);
    return;
  }
  if (reset) {
    if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_RESET !== "true") {
      throw new Error("Refusing to reset a production database. Set SEED_ALLOW_RESET=true to override.");
    }
    console.log("Wiping existing data...");
    await wipe();
  }

  console.log("Seeding demo data...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Catalog: facilities, doctors, packages ────────────────────────────────
  const facilities: SeededFacility[] = [];
  for (const f of FACILITIES) {
    const facility = await prisma.facility.create({
      data: {
        slug: f.slug,
        name: f.name,
        nameAr: f.nameAr,
        type: f.type,
        description: f.description,
        descriptionAr: f.descriptionAr,
        address: f.address,
        phone: f.phone,
        email: f.email ?? null,
        website: f.website ?? null,
        rating: f.baseRating,
        specialties: f.specialties,
        accreditations: f.accreditations,
        latitude: f.latitude,
        longitude: f.longitude,
        doctors: {
          create: f.doctors.map((d) => ({ ...d, rating: Math.min(5, Math.round((f.baseRating + rand() * 0.4) * 10) / 10) })),
        },
        treatmentPackages: { create: f.packages },
      },
      include: { doctors: true, treatmentPackages: true },
    });
    facilities.push({ ...facility, seed: f });
  }

  // ── Catalog: hotels & room types ──────────────────────────────────────────
  const hotels: SeededHotel[] = [];
  for (const h of HOTELS) {
    const hotel = await prisma.hotel.create({
      data: {
        slug: h.slug,
        name: h.name,
        nameAr: h.nameAr,
        description: h.description,
        descriptionAr: h.descriptionAr,
        address: h.address,
        phone: h.phone,
        email: h.email,
        starRating: h.starRating,
        rating: h.baseRating,
        amenities: h.amenities,
        latitude: h.latitude,
        longitude: h.longitude,
        roomTypes: { create: h.roomTypes },
      },
      include: { roomTypes: true },
    });
    hotels.push({ ...hotel, seed: h });
  }

  // ── Staff accounts ────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@medvisit.sa",
      name: "Platform Administrator",
      password: passwordHash,
      role: "SUPER_ADMIN",
      nationality: "SA",
      createdAt: daysFromToday(-400),
    },
  });

  const hospitalAdmins = [];
  for (const f of facilities) {
    hospitalAdmins.push(
      await prisma.user.create({
        data: {
          email: f.seed.adminEmail,
          name: f.seed.adminName,
          password: passwordHash,
          role: "HOSPITAL_ADMIN",
          facilityId: f.id,
          nationality: "SA",
          createdAt: daysFromToday(-380),
        },
      })
    );
  }

  for (const h of hotels) {
    await prisma.user.create({
      data: {
        email: h.seed.managerEmail,
        name: h.seed.managerName,
        password: passwordHash,
        role: "HOTEL_MANAGER",
        hotelId: h.id,
        nationality: "SA",
        createdAt: daysFromToday(-380),
      },
    });
  }

  // ── Patients ──────────────────────────────────────────────────────────────
  const demoPatient = await prisma.user.create({
    data: {
      email: "patient@medvisit.sa",
      name: "Ahmed Hassan",
      password: passwordHash,
      role: "PATIENT",
      nationality: "KW",
      phone: "+965 5000 1234",
      createdAt: daysFromToday(-120),
    },
  });

  const patientRows: Prisma.UserCreateManyInput[] = [];
  for (let i = 0; i < 70; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    // Registrations accelerate over the year (platform growth).
    const ageDays = Math.floor(Math.pow(rand(), 1.6) * 360);
    patientRows.push({
      id: randomUUID(),
      email: `${first}.${last}.${i}@example.com`.toLowerCase().replace(/[^a-z0-9.@-]/g, ""),
      name: `${first} ${last}`,
      password: passwordHash,
      role: "PATIENT",
      locale: rand() < 0.6 ? "ar" : "en",
      nationality: weighted(NATIONALITY_WEIGHTS),
      phone: `+9${randInt(10, 99)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}`,
      createdAt: daysFromToday(-ageDays),
    });
  }
  await prisma.user.createMany({ data: patientRows });
  const patients = [
    { id: demoPatient.id, createdAt: demoPatient.createdAt },
    ...patientRows.map((p) => ({ id: p.id!, createdAt: p.createdAt as Date })),
  ];

  // ── Medical reports (triage history) ──────────────────────────────────────
  const allSpecialties = Array.from(new Set(facilities.flatMap((f) => f.specialties)));
  const reportRows: Prisma.MedicalReportCreateManyInput[] = [];
  for (const p of patients) {
    const count = p.id === demoPatient.id ? 2 : randInt(0, 2);
    for (let i = 0; i < count; i++) {
      const sinceSignup = Math.max(1, Math.floor((today.getTime() - p.createdAt.getTime()) / DAY));
      const createdAt = daysFromToday(-randInt(0, sinceSignup));
      const specialty = pick(allSpecialties);
      const urgency = weighted(URGENCY_WEIGHTS) as "LOW" | "MODERATE" | "HIGH" | "EMERGENCY";
      const summary = `Findings suggest a ${specialty.toLowerCase()} consultation is advisable (${urgency.toLowerCase()} priority).`;
      reportRows.push({
        id: randomUUID(),
        userId: p.id,
        fileName: pick(REPORT_FILES),
        fileType: "application/pdf",
        fileSize: randInt(80_000, 2_400_000),
        specialty,
        urgency,
        summary,
        status: "ANALYZED",
        analysis: {
          findings: [`Indicators relevant to ${specialty}`, "Values outside reference range noted"],
          recommendedSpecialty: specialty,
          urgency: urgency.toLowerCase(),
          summary,
          suggestedActions: [`Book a ${specialty} consultation`, "Bring previous reports to the visit"],
          recommendedTests: ["Complete blood count", "Specialist examination"],
        },
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  await prisma.medicalReport.createMany({ data: reportRows });

  // ── Appointments ──────────────────────────────────────────────────────────
  const appointmentRows: Prisma.AppointmentCreateManyInput[] = [];
  const appointmentMeta: { id: string; userId: string; scheduledAt: Date; status: string; facilityIdx: number }[] = [];
  const facilityWeights: [number, number][] = facilities.map((f, i) => [i, Math.round(f.seed.baseRating * 10) - 35]);

  function addAppointment(userId: string, dayOffset: number, forceStatus?: string) {
    const facilityIdx = weighted(facilityWeights);
    const facility = facilities[facilityIdx]!;
    const usePackage = rand() < 0.55 && facility.treatmentPackages.length > 0;
    const pkg = usePackage ? pick(facility.treatmentPackages) : null;
    const doctorPool = facility.doctors.filter((d) => !pkg || d.specialty === pkg.specialty);
    const doctor = doctorPool.length > 0 && rand() < 0.85 ? pick(doctorPool) : null;
    const specialty = pkg?.specialty ?? doctor?.specialty ?? pick(facility.specialties);
    const scheduledAt = clinicTime(daysFromToday(dayOffset));
    const isPast = scheduledAt.getTime() < Date.now();

    let status = forceStatus;
    if (!status) {
      status = isPast
        ? weighted([["COMPLETED", 78], ["CANCELLED", 14], ["NO_SHOW", 8]])
        : weighted([["PENDING", 42], ["CONFIRMED", 50], ["CANCELLED", 8]]);
    }
    const createdAt = new Date(scheduledAt.getTime() - randInt(3, 30) * DAY);
    const id = randomUUID();
    appointmentRows.push({
      id,
      reference: reference("AP"),
      userId,
      facilityId: facility.id,
      doctorId: doctor?.id ?? null,
      packageId: pkg?.id ?? null,
      specialty,
      scheduledAt,
      status: status as Prisma.AppointmentCreateManyInput["status"],
      price: pkg?.price ?? doctor?.consultationFee ?? 300,
      patientNotes: rand() < 0.4 ? "I will be travelling with a family member." : null,
      confirmedAt: ["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(status) ? new Date(createdAt.getTime() + DAY) : null,
      completedAt: status === "COMPLETED" ? scheduledAt : null,
      cancelledAt: status === "CANCELLED" ? new Date(createdAt.getTime() + 2 * DAY) : null,
      cancelledReason: status === "CANCELLED" ? pick(["Travel plans changed", "Rescheduled at patient request", "Visa delay"]) : null,
      createdAt,
      updatedAt: createdAt,
    });
    appointmentMeta.push({ id, userId, scheduledAt, status, facilityIdx });
  }

  // Volume grows over the year: more appointments in recent months.
  for (let i = 0; i < 300; i++) {
    const patient = pick(patients);
    const sinceSignup = Math.floor((today.getTime() - patient.createdAt.getTime()) / DAY);
    const back = Math.floor(Math.pow(rand(), 1.4) * Math.min(330, Math.max(5, sinceSignup)));
    const offset = rand() < 0.18 ? randInt(1, 45) : -back;
    addAppointment(patient.id, offset);
  }
  // Demo patient: one completed visit, one upcoming confirmed, one pending.
  addAppointment(demoPatient.id, -60, "COMPLETED");
  addAppointment(demoPatient.id, 12, "CONFIRMED");
  addAppointment(demoPatient.id, 26, "PENDING");
  await prisma.appointment.createMany({ data: appointmentRows });

  // ── Hotel bookings ────────────────────────────────────────────────────────
  const bookingRows: Prisma.HotelBookingCreateManyInput[] = [];
  const bookingMeta: { userId: string; hotelIdx: number; status: string }[] = [];

  function addBooking(userId: string, checkIn: Date, nights: number, appointmentId: string | null, hotelIdx?: number) {
    const hIdx = hotelIdx ?? randInt(0, hotels.length - 1);
    const hotel = hotels[hIdx]!;
    const room = pick(hotel.roomTypes);
    const rooms = rand() < 0.85 ? 1 : 2;
    const checkOut = new Date(checkIn.getTime() + nights * DAY);
    let status: string;
    if (checkOut <= today) status = weighted([["CHECKED_OUT", 88], ["CANCELLED", 12]]);
    else if (checkIn <= today) status = "CHECKED_IN";
    else status = weighted([["PENDING", 35], ["CONFIRMED", 57], ["CANCELLED", 8]]);
    const createdAt = new Date(checkIn.getTime() - randInt(5, 35) * DAY);
    const totalPrice = room.pricePerNight * nights * rooms;
    bookingRows.push({
      id: randomUUID(),
      reference: reference("HB"),
      userId,
      hotelId: hotel.id,
      roomTypeId: room.id,
      appointmentId,
      checkIn,
      checkOut,
      guests: Math.min(room.capacity * rooms, randInt(1, 3)),
      rooms,
      nightlyRate: room.pricePerNight,
      totalPrice,
      status: status as Prisma.HotelBookingCreateManyInput["status"],
      specialRequests: rand() < 0.3 ? pick(["Ground floor please", "Late check-in", "Wheelchair needed", "Quiet room"]) : null,
      confirmedAt: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(status) ? new Date(createdAt.getTime() + DAY) : null,
      checkedInAt: ["CHECKED_IN", "CHECKED_OUT"].includes(status) ? new Date(checkIn.getTime() + 14 * 3_600_000) : null,
      checkedOutAt: status === "CHECKED_OUT" ? new Date(checkOut.getTime() + 9 * 3_600_000) : null,
      cancelledAt: status === "CANCELLED" ? new Date(createdAt.getTime() + 3 * DAY) : null,
      createdAt,
      updatedAt: createdAt,
    });
    bookingMeta.push({ userId, hotelIdx: hIdx, status });
  }

  for (const appt of appointmentMeta) {
    if (appt.status === "CANCELLED" || rand() > 0.62) continue;
    const apptDay = new Date(appt.scheduledAt);
    apptDay.setUTCHours(0, 0, 0, 0);
    addBooking(appt.userId, new Date(apptDay.getTime() - DAY), randInt(2, 7), appt.id);
  }
  // Some stays not linked to an appointment (companions, follow-ups).
  for (let i = 0; i < 30; i++) {
    addBooking(pick(patients).id, daysFromToday(randInt(-300, 40)), randInt(1, 5), null);
  }
  await prisma.hotelBooking.createMany({ data: bookingRows });

  // ── Reviews (only from completed visits / finished stays) ────────────────
  const reviewRows: Prisma.ReviewCreateManyInput[] = [];
  const reviewedFacility = new Set<string>();
  const reviewedHotel = new Set<string>();
  for (const a of appointmentMeta) {
    if (a.status !== "COMPLETED" || rand() > 0.45) continue;
    const facility = facilities[a.facilityIdx]!;
    const key = `${a.userId}:${facility.id}`;
    if (reviewedFacility.has(key)) continue;
    reviewedFacility.add(key);
    const rating = Math.max(1, Math.min(5, Math.round(facility.seed.baseRating + (rand() - 0.5) * 1.8)));
    reviewRows.push({ userId: a.userId, facilityId: facility.id, rating, comment: rand() < 0.7 ? pick(REVIEW_COMMENTS) : null });
  }
  for (const b of bookingMeta) {
    if (b.status !== "CHECKED_OUT" || rand() > 0.4) continue;
    const hotel = hotels[b.hotelIdx]!;
    const key = `${b.userId}:${hotel.id}`;
    if (reviewedHotel.has(key)) continue;
    reviewedHotel.add(key);
    const rating = Math.max(1, Math.min(5, Math.round(hotel.seed.baseRating + (rand() - 0.5) * 1.8)));
    reviewRows.push({ userId: b.userId, hotelId: hotel.id, rating, comment: rand() < 0.7 ? pick(REVIEW_COMMENTS) : null });
  }
  await prisma.review.createMany({ data: reviewRows });

  // Recompute denormalized ratings from reviews.
  for (const f of facilities) {
    const agg = await prisma.review.aggregate({ where: { facilityId: f.id }, _avg: { rating: true }, _count: true });
    if (agg._count > 0) {
      await prisma.facility.update({
        where: { id: f.id },
        data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
      });
    }
  }
  for (const h of hotels) {
    const agg = await prisma.review.aggregate({ where: { hotelId: h.id }, _avg: { rating: true }, _count: true });
    if (agg._count > 0) {
      await prisma.hotel.update({
        where: { id: h.id },
        data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
      });
    }
  }

  // ── Demo patient extras: notifications & chat history ─────────────────────
  const demoUpcoming = appointmentRows.find((a) => a.userId === demoPatient.id && a.status === "CONFIRMED");
  const demoFacility = facilities.find((f) => f.id === demoUpcoming?.facilityId);
  await prisma.notification.createMany({
    data: [
      {
        userId: demoPatient.id,
        kind: "appointmentConfirmed",
        data: { reference: demoUpcoming?.reference ?? "", facility: demoFacility?.name ?? "" },
        link: "/dashboard",
        createdAt: daysFromToday(-2),
      },
      {
        userId: demoPatient.id,
        kind: "welcome",
        data: { name: "Ahmed" },
        link: "/triage",
        readAt: daysFromToday(-119),
        createdAt: daysFromToday(-120),
      },
    ],
  });
  await prisma.chatMessage.createMany({
    data: [
      { userId: demoPatient.id, role: "user", content: "I need a cardiologist in Al-Ahsa", createdAt: daysFromToday(-3) },
      {
        userId: demoPatient.id,
        role: "assistant",
        content:
          "Al-Moosa Specialist Hospital and Saad Specialist Hospital both have experienced cardiologists. Would you like me to help you book a consultation?",
        createdAt: new Date(daysFromToday(-3).getTime() + 5_000),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: superAdmin.id, action: "system.seed", entityType: "System", metadata: { note: "Demo data generated" } },
      { actorId: hospitalAdmins[0]!.id, action: "facility.update", entityType: "Facility", entityId: facilities[0]!.id },
    ],
  });

  console.log(
    [
      `Seed complete:`,
      `  facilities: ${facilities.length}, hotels: ${hotels.length}`,
      `  patients: ${patients.length}, reports: ${reportRows.length}`,
      `  appointments: ${appointmentRows.length}, hotel bookings: ${bookingRows.length}, reviews: ${reviewRows.length}`,
      ``,
      `Demo accounts (password: ${DEMO_PASSWORD}):`,
      `  Super admin     admin@medvisit.sa`,
      `  Hospital admin  ${FACILITIES[0]!.adminEmail}`,
      `  Hotel manager   ${HOTELS[0]!.managerEmail}`,
      `  Patient         patient@medvisit.sa`,
    ].join("\n")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
