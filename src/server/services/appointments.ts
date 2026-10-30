import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  AppointmentListQuery,
  CreateAppointmentInput,
  StaffUpdateAppointmentInput,
} from "@/lib/validators/appointment";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  canTransitionAppointment,
  type AppointmentStatusValue,
} from "@/lib/status";
import { generateReference } from "@/lib/reference";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/errors";
import { notify, notifyStaff } from "./notifications";
import { recordAudit } from "./audit";

/** Minimum gap between two active appointments for the same doctor. */
const DOCTOR_SLOT_MINUTES = 30;

export const appointmentListInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, nationality: true } },
  facility: { select: { id: true, name: true, nameAr: true, slug: true } },
  doctor: { select: { id: true, name: true, nameAr: true } },
  package: { select: { id: true, name: true, nameAr: true } },
  report: { select: { id: true, fileName: true, urgency: true, summary: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentListInclude }>;

function startOfDayUtc(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
function endOfDayUtc(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

async function assertDoctorAvailable(doctorId: string, scheduledAt: Date, excludeAppointmentId?: string) {
  const windowMs = DOCTOR_SLOT_MINUTES * 60_000;
  const clash = await prisma.appointment.findFirst({
    where: {
      doctorId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      scheduledAt: { gt: new Date(scheduledAt.getTime() - windowMs), lt: new Date(scheduledAt.getTime() + windowMs) },
      ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new ConflictError("The selected doctor is not available at this time. Please choose another time.");
}

async function createWithUniqueReference<T>(create: (reference: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await create(generateReference("AP"));
    } catch (err) {
      const code = (err as { code?: string }).code;
      const target = JSON.stringify((err as { meta?: unknown }).meta ?? "");
      if (code === "P2002" && target.includes("reference")) continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique appointment reference");
}

// ─── Patient operations ─────────────────────────────────────────────────────

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  const facility = await prisma.facility.findFirst({ where: { id: input.facilityId, isActive: true } });
  if (!facility) throw new NotFoundError("Facility");

  const doctor = input.doctorId
    ? await prisma.doctor.findFirst({ where: { id: input.doctorId, facilityId: facility.id, isActive: true } })
    : null;
  if (input.doctorId && !doctor) throw new BadRequestError("Selected doctor is not available at this facility");

  const pkg = input.packageId
    ? await prisma.treatmentPackage.findFirst({ where: { id: input.packageId, facilityId: facility.id, isActive: true } })
    : null;
  if (input.packageId && !pkg) throw new BadRequestError("Selected package is not available at this facility");

  if (input.reportId) {
    const owned = await prisma.medicalReport.count({ where: { id: input.reportId, userId } });
    if (!owned) throw new BadRequestError("Selected report was not found");
  }

  const specialty = pkg?.specialty ?? doctor?.specialty ?? input.specialty;
  if (!specialty) throw new BadRequestError("Choose a specialty, doctor, or package");

  const duplicate = await prisma.appointment.findFirst({
    where: {
      userId,
      facilityId: facility.id,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      scheduledAt: {
        gt: new Date(input.scheduledAt.getTime() - 2 * 3_600_000),
        lt: new Date(input.scheduledAt.getTime() + 2 * 3_600_000),
      },
    },
    select: { reference: true },
  });
  if (duplicate) {
    throw new ConflictError(`You already have an appointment around this time (${duplicate.reference})`);
  }

  if (doctor) await assertDoctorAvailable(doctor.id, input.scheduledAt);

  const appointment = await createWithUniqueReference((reference) =>
    prisma.appointment.create({
      data: {
        reference,
        userId,
        facilityId: facility.id,
        doctorId: doctor?.id ?? null,
        packageId: pkg?.id ?? null,
        reportId: input.reportId ?? null,
        specialty,
        scheduledAt: input.scheduledAt,
        patientNotes: input.notes ?? null,
        price: pkg?.price ?? doctor?.consultationFee ?? null,
        currency: pkg?.currency ?? "SAR",
      },
      include: appointmentListInclude,
    })
  );

  const date = appointment.scheduledAt.toISOString();
  await Promise.all([
    notify(userId, "appointmentRequested", { reference: appointment.reference, facility: facility.name, date }, "/dashboard"),
    notifyStaff(
      { facilityId: facility.id },
      "newAppointmentRequest",
      { reference: appointment.reference, patient: appointment.user.name ?? appointment.user.email, date },
      "/hospital/appointments"
    ),
    recordAudit({ actorId: userId, action: "appointment.create", entityType: "Appointment", entityId: appointment.id }),
  ]);
  return appointment;
}

export async function listPatientAppointments(userId: string) {
  return prisma.appointment.findMany({
    where: { userId },
    include: {
      ...appointmentListInclude,
      hotelBookings: { select: { id: true, reference: true, status: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function cancelPatientAppointment(userId: string, id: string, reason?: string | null) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, userId },
    include: { facility: { select: { id: true, name: true } }, user: { select: { name: true, email: true } } },
  });
  if (!appointment) throw new NotFoundError("Appointment");
  if (!canTransitionAppointment(appointment.status, "CANCELLED")) {
    throw new BadRequestError("This appointment can no longer be cancelled");
  }
  if (appointment.scheduledAt.getTime() < Date.now()) {
    throw new BadRequestError("Past appointments cannot be cancelled");
  }
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledReason: reason ?? "Cancelled by patient" },
  });
  await Promise.all([
    notifyStaff(
      { facilityId: appointment.facility.id },
      "appointmentCancelledByPatient",
      { reference: appointment.reference, patient: appointment.user.name ?? appointment.user.email },
      "/hospital/appointments"
    ),
    recordAudit({ actorId: userId, action: "appointment.cancel", entityType: "Appointment", entityId: id }),
  ]);
  return updated;
}

// ─── Staff operations ───────────────────────────────────────────────────────

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * 3_600_000);
}

function staffWhere(scopeFacilityId: string | undefined, query: AppointmentListQuery): Prisma.AppointmentWhereInput {
  const facilityId = scopeFacilityId ?? query.facilityId;
  const scheduledAt: Prisma.DateTimeFilter = {};
  if (query.from) scheduledAt.gte = startOfDayUtc(query.from);
  if (query.to) scheduledAt.lte = endOfDayUtc(query.to);
  if (query.view === "upcoming") {
    const today = startOfToday();
    if (!scheduledAt.gte || (scheduledAt.gte as Date) < today) scheduledAt.gte = today;
  } else if (query.view === "past") {
    scheduledAt.lt = startOfToday();
  }
  return {
    ...(facilityId ? { facilityId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(Object.keys(scheduledAt).length ? { scheduledAt } : {}),
    ...(query.q
      ? {
          OR: [
            { reference: { contains: query.q.toUpperCase() } },
            { specialty: { contains: query.q, mode: "insensitive" } },
            { user: { name: { contains: query.q, mode: "insensitive" } } },
            { user: { email: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

/**
 * Lists appointments for staff. `scopeFacilityId` pins hospital admins to their
 * facility; super admins pass undefined and may filter with query.facilityId.
 */
export async function listAppointmentsForStaff(scopeFacilityId: string | undefined, query: AppointmentListQuery) {
  const where = staffWhere(scopeFacilityId, query);
  const [items, total, statusCounts] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: appointmentListInclude,
      orderBy: { scheduledAt: query.view === "upcoming" ? "asc" : "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.appointment.count({ where }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: staffWhere(scopeFacilityId, { ...query, status: undefined }),
      _count: true,
    }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Partial<Record<AppointmentStatusValue, number>>;
  return { items, total, page: query.page, pageSize: query.pageSize, counts };
}

export async function exportAppointmentsForStaff(scopeFacilityId: string | undefined, query: AppointmentListQuery) {
  return prisma.appointment.findMany({
    where: staffWhere(scopeFacilityId, query),
    include: appointmentListInclude,
    orderBy: { scheduledAt: "desc" },
    take: 10_000,
  });
}

export async function updateAppointmentByStaff(
  actorId: string,
  scopeFacilityId: string | undefined,
  id: string,
  input: StaffUpdateAppointmentInput,
  ipAddress?: string
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, ...(scopeFacilityId ? { facilityId: scopeFacilityId } : {}) },
    include: { facility: { select: { name: true } } },
  });
  if (!appointment) throw new NotFoundError("Appointment");

  const data: Prisma.AppointmentUpdateInput = {};
  const now = new Date();
  let notifyKind: "appointmentConfirmed" | "appointmentCancelled" | "appointmentCompleted" | "appointmentRescheduled" | null = null;

  if (input.status && input.status !== appointment.status) {
    if (!canTransitionAppointment(appointment.status, input.status)) {
      throw new BadRequestError(`Cannot change status from ${appointment.status} to ${input.status}`);
    }
    if ((input.status === "COMPLETED" || input.status === "NO_SHOW") && appointment.scheduledAt > now) {
      throw new BadRequestError("Only appointments that have already taken place can be completed or marked as no-show");
    }
    data.status = input.status;
    if (input.status === "CONFIRMED") {
      data.confirmedAt = now;
      notifyKind = "appointmentConfirmed";
    } else if (input.status === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelledReason = input.cancelledReason ?? "Cancelled by facility";
      notifyKind = "appointmentCancelled";
    } else if (input.status === "COMPLETED") {
      data.completedAt = now;
      notifyKind = "appointmentCompleted";
    }
  }

  if (input.scheduledAt && input.scheduledAt.getTime() !== appointment.scheduledAt.getTime()) {
    const effectiveStatus = (input.status ?? appointment.status) as AppointmentStatusValue;
    if (!ACTIVE_APPOINTMENT_STATUSES.includes(effectiveStatus)) {
      throw new BadRequestError("Only pending or confirmed appointments can be rescheduled");
    }
    if (input.scheduledAt.getTime() < now.getTime()) {
      throw new BadRequestError("The new time must be in the future");
    }
    if (appointment.doctorId) await assertDoctorAvailable(appointment.doctorId, input.scheduledAt, appointment.id);
    data.scheduledAt = input.scheduledAt;
    notifyKind = notifyKind ?? "appointmentRescheduled";
  }

  if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;

  const updated = await prisma.appointment.update({ where: { id }, data, include: appointmentListInclude });

  if (notifyKind) {
    await notify(
      updated.userId,
      notifyKind,
      { reference: updated.reference, facility: appointment.facility.name, date: updated.scheduledAt.toISOString() },
      "/dashboard"
    );
  }
  await recordAudit({
    actorId,
    action: "appointment.update",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      from: appointment.status,
      to: updated.status,
      ...(input.scheduledAt ? { scheduledAt: updated.scheduledAt.toISOString() } : {}),
    },
    ipAddress,
  });
  return updated;
}
