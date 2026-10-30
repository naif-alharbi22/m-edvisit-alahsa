import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { DoctorInput, FacilityInput, PackageInput } from "@/lib/validators/catalog";
import { ConflictError, NotFoundError } from "@/server/errors";
import { slugify } from "@/lib/utils";
import { recordAudit } from "./audit";

// ─── Public catalog ─────────────────────────────────────────────────────────

const publicFacilityInclude = {
  doctors: { where: { isActive: true }, orderBy: { rating: "desc" } },
  treatmentPackages: { where: { isActive: true }, orderBy: { price: "asc" } },
} satisfies Prisma.FacilityInclude;

export type PublicFacility = Prisma.FacilityGetPayload<{ include: typeof publicFacilityInclude }>;

export async function listPublicFacilities(filters: { specialty?: string | null; search?: string | null } = {}) {
  const where: Prisma.FacilityWhereInput = { isActive: true };
  if (filters.specialty) where.specialties = { has: filters.specialty };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { nameAr: { contains: filters.search, mode: "insensitive" } },
      { city: { contains: filters.search, mode: "insensitive" } },
      { specialties: { has: filters.search } },
    ];
  }
  return prisma.facility.findMany({ where, include: publicFacilityInclude, orderBy: [{ rating: "desc" }, { name: "asc" }] });
}

export async function listSpecialties(): Promise<string[]> {
  const rows = await prisma.facility.findMany({ where: { isActive: true }, select: { specialties: true } });
  return Array.from(new Set(rows.flatMap((r) => r.specialties))).sort();
}

export async function getPublicFacilityBySlug(slug: string) {
  return prisma.facility.findFirst({
    where: { slug, isActive: true },
    include: {
      ...publicFacilityInclude,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true, nationality: true } } },
      },
    },
  });
}

// ─── Administration ─────────────────────────────────────────────────────────

async function uniqueSlug(model: "facility" | "hotel", base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || model;
  let candidate = root;
  for (let i = 2; ; i++) {
    const clash =
      model === "facility"
        ? await prisma.facility.findFirst({ where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })
        : await prisma.hotel.findFirst({ where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return candidate;
    candidate = `${root}-${i}`;
  }
}
export { uniqueSlug };

export async function listFacilitiesAdmin(query: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.FacilityWhereInput = query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { nameAr: { contains: query.q, mode: "insensitive" } },
          { city: { contains: query.q, mode: "insensitive" } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      include: { _count: { select: { doctors: true, treatmentPackages: true, appointments: true, staff: true } } },
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.facility.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function listFacilityOptions() {
  return prisma.facility.findMany({ select: { id: true, name: true, nameAr: true }, orderBy: { name: "asc" } });
}

export async function getFacility(id: string) {
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) throw new NotFoundError("Facility");
  return facility;
}

function facilityData(input: Omit<FacilityInput, "isActive"> & { isActive?: boolean }) {
  return {
    name: input.name,
    nameAr: input.nameAr ?? null,
    type: input.type,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    city: input.city,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    website: input.website ?? null,
    image: input.image ?? null,
    specialties: input.specialties,
    accreditations: input.accreditations,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

export async function createFacility(actorId: string, input: FacilityInput) {
  const facility = await prisma.facility.create({
    data: { ...facilityData(input), slug: await uniqueSlug("facility", input.name) },
  });
  await recordAudit({ actorId, action: "facility.create", entityType: "Facility", entityId: facility.id, metadata: { name: facility.name } });
  return facility;
}

export async function updateFacility(actorId: string, id: string, input: Omit<FacilityInput, "isActive"> & { isActive?: boolean }) {
  await getFacility(id);
  const facility = await prisma.facility.update({ where: { id }, data: facilityData(input) });
  await recordAudit({ actorId, action: "facility.update", entityType: "Facility", entityId: id });
  return facility;
}

export async function deleteFacility(actorId: string, id: string) {
  const facility = await prisma.facility.findUnique({ where: { id }, include: { _count: { select: { appointments: true } } } });
  if (!facility) throw new NotFoundError("Facility");
  if (facility._count.appointments > 0) {
    throw new ConflictError("This facility has appointment history. Deactivate it instead of deleting.");
  }
  await prisma.facility.delete({ where: { id } });
  await recordAudit({ actorId, action: "facility.delete", entityType: "Facility", entityId: id, metadata: { name: facility.name } });
}

// ─── Doctors ────────────────────────────────────────────────────────────────

export async function listDoctors(facilityId: string) {
  return prisma.doctor.findMany({
    where: { facilityId },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

function doctorData(input: DoctorInput) {
  return {
    name: input.name,
    nameAr: input.nameAr ?? null,
    specialty: input.specialty,
    title: input.title ?? null,
    image: input.image ?? null,
    yearsExp: input.yearsExp,
    languages: input.languages,
    bio: input.bio ?? null,
    bioAr: input.bioAr ?? null,
    consultationFee: input.consultationFee ?? null,
    isActive: input.isActive,
  };
}

export async function createDoctor(actorId: string, facilityId: string, input: DoctorInput) {
  await getFacility(facilityId);
  const doctor = await prisma.doctor.create({ data: { ...doctorData(input), facilityId } });
  await recordAudit({ actorId, action: "doctor.create", entityType: "Doctor", entityId: doctor.id, metadata: { facilityId } });
  return doctor;
}

async function getScopedDoctor(facilityId: string, id: string) {
  const doctor = await prisma.doctor.findFirst({ where: { id, facilityId } });
  if (!doctor) throw new NotFoundError("Doctor");
  return doctor;
}

export async function updateDoctor(actorId: string, facilityId: string, id: string, input: DoctorInput) {
  await getScopedDoctor(facilityId, id);
  const doctor = await prisma.doctor.update({ where: { id }, data: doctorData(input) });
  await recordAudit({ actorId, action: "doctor.update", entityType: "Doctor", entityId: id });
  return doctor;
}

/** Hard-deletes unused doctors; doctors with appointment history are deactivated. */
export async function deleteDoctor(actorId: string, facilityId: string, id: string) {
  await getScopedDoctor(facilityId, id);
  const used = await prisma.appointment.count({ where: { doctorId: id } });
  if (used > 0) {
    await prisma.doctor.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ actorId, action: "doctor.deactivate", entityType: "Doctor", entityId: id });
    return { deleted: false, deactivated: true };
  }
  await prisma.doctor.delete({ where: { id } });
  await recordAudit({ actorId, action: "doctor.delete", entityType: "Doctor", entityId: id });
  return { deleted: true, deactivated: false };
}

// ─── Treatment packages ─────────────────────────────────────────────────────

export async function listPackages(facilityId: string) {
  return prisma.treatmentPackage.findMany({
    where: { facilityId },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

function packageData(input: PackageInput) {
  return {
    name: input.name,
    nameAr: input.nameAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    specialty: input.specialty,
    price: input.price,
    currency: input.currency,
    duration: input.duration ?? null,
    includes: input.includes,
    isActive: input.isActive,
  };
}

export async function createPackage(actorId: string, facilityId: string, input: PackageInput) {
  await getFacility(facilityId);
  const pkg = await prisma.treatmentPackage.create({ data: { ...packageData(input), facilityId } });
  await recordAudit({ actorId, action: "package.create", entityType: "TreatmentPackage", entityId: pkg.id, metadata: { facilityId } });
  return pkg;
}

async function getScopedPackage(facilityId: string, id: string) {
  const pkg = await prisma.treatmentPackage.findFirst({ where: { id, facilityId } });
  if (!pkg) throw new NotFoundError("Package");
  return pkg;
}

export async function updatePackage(actorId: string, facilityId: string, id: string, input: PackageInput) {
  await getScopedPackage(facilityId, id);
  const pkg = await prisma.treatmentPackage.update({ where: { id }, data: packageData(input) });
  await recordAudit({ actorId, action: "package.update", entityType: "TreatmentPackage", entityId: id });
  return pkg;
}

export async function deletePackage(actorId: string, facilityId: string, id: string) {
  await getScopedPackage(facilityId, id);
  const used = await prisma.appointment.count({ where: { packageId: id } });
  if (used > 0) {
    await prisma.treatmentPackage.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ actorId, action: "package.deactivate", entityType: "TreatmentPackage", entityId: id });
    return { deleted: false, deactivated: true };
  }
  await prisma.treatmentPackage.delete({ where: { id } });
  await recordAudit({ actorId, action: "package.delete", entityType: "TreatmentPackage", entityId: id });
  return { deleted: true, deactivated: false };
}
