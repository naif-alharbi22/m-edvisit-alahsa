import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelPatientAppointment,
  createAppointment,
  listAppointmentsForStaff,
  updateAppointmentByStaff,
} from "@/server/services/appointments";
import { appointmentListQuerySchema } from "@/lib/validators/appointment";
import { createDoctor, createFacility, createPackage, createUser, futureAt } from "./factories";

let facility: Awaited<ReturnType<typeof createFacility>>;
let otherFacility: Awaited<ReturnType<typeof createFacility>>;
let doctor: Awaited<ReturnType<typeof createDoctor>>;
let pkg: Awaited<ReturnType<typeof createPackage>>;
let patient: Awaited<ReturnType<typeof createUser>>;
let admin: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  facility = await createFacility();
  otherFacility = await createFacility();
  doctor = await createDoctor(facility.id, "Cardiology", 450);
  pkg = await createPackage(facility.id, "Orthopedics", 18000);
  patient = await createUser("PATIENT");
  admin = await createUser("HOSPITAL_ADMIN", { facilityId: facility.id });
});

describe("createAppointment", () => {
  it("prices from the package and derives the specialty", async () => {
    const a = await createAppointment(patient.id, { facilityId: facility.id, packageId: pkg.id, scheduledAt: futureAt(10) });
    expect(a.status).toBe("PENDING");
    expect(a.specialty).toBe("Orthopedics");
    expect(a.price).toBe(18000);
    expect(a.reference).toMatch(/^AP-/);
  });

  it("prices from the doctor's consultation fee", async () => {
    const a = await createAppointment(patient.id, { facilityId: facility.id, doctorId: doctor.id, scheduledAt: futureAt(12) });
    expect(a.price).toBe(450);
    expect(a.specialty).toBe("Cardiology");
  });

  it("notifies the patient and the facility staff", async () => {
    const before = await prisma.notification.count({ where: { userId: admin.id, kind: "newAppointmentRequest" } });
    await createAppointment(patient.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(14) });
    expect(await prisma.notification.count({ where: { userId: admin.id, kind: "newAppointmentRequest" } })).toBe(before + 1);
    expect(await prisma.notification.count({ where: { userId: patient.id, kind: "appointmentRequested" } })).toBeGreaterThan(0);
  });

  it("requires a specialty when no doctor or package is chosen", async () => {
    await expect(createAppointment(patient.id, { facilityId: facility.id, scheduledAt: futureAt(16) })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects doctors and packages from another facility", async () => {
    const foreignDoctor = await createDoctor(otherFacility.id);
    await expect(
      createAppointment(patient.id, { facilityId: facility.id, doctorId: foreignDoctor.id, scheduledAt: futureAt(18) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("prevents double-booking a doctor and duplicate patient requests", async () => {
    const other = await createUser("PATIENT");
    await createAppointment(patient.id, { facilityId: facility.id, doctorId: doctor.id, scheduledAt: futureAt(20, 9) });
    await expect(
      createAppointment(other.id, { facilityId: facility.id, doctorId: doctor.id, scheduledAt: new Date(futureAt(20, 9).getTime() + 15 * 60_000) })
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      createAppointment(patient.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(20, 10) })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses inactive facilities", async () => {
    const hidden = await createFacility({ isActive: false });
    await expect(createAppointment(patient.id, { facilityId: hidden.id, specialty: "Cardiology", scheduledAt: futureAt(22) })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("staff workflow", () => {
  it("confirms, reschedules and enforces transitions", async () => {
    const a = await createAppointment(patient.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(30) });
    const confirmed = await updateAppointmentByStaff(admin.id, facility.id, a.id, { status: "CONFIRMED" });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(await prisma.notification.count({ where: { userId: patient.id, kind: "appointmentConfirmed" } })).toBe(1);

    const moved = await updateAppointmentByStaff(admin.id, facility.id, a.id, { scheduledAt: futureAt(31) });
    expect(moved.scheduledAt.toISOString()).toBe(futureAt(31).toISOString());

    await expect(updateAppointmentByStaff(admin.id, facility.id, a.id, { status: "PENDING" })).rejects.toMatchObject({ status: 400 });
    // Cannot complete a visit that has not happened yet.
    await expect(updateAppointmentByStaff(admin.id, facility.id, a.id, { status: "COMPLETED" })).rejects.toMatchObject({ status: 400 });

    const audit = await prisma.auditLog.count({ where: { entityId: a.id, action: "appointment.update" } });
    expect(audit).toBe(2);
  });

  it("completes past visits", async () => {
    const past = await prisma.appointment.create({
      data: { reference: "AP-PAST01", userId: patient.id, facilityId: facility.id, specialty: "Cardiology", scheduledAt: new Date(Date.now() - 86_400_000), status: "CONFIRMED" },
    });
    const done = await updateAppointmentByStaff(admin.id, facility.id, past.id, { status: "COMPLETED" });
    expect(done.status).toBe("COMPLETED");
    expect(done.completedAt).not.toBeNull();
  });

  it("scopes staff to their own facility", async () => {
    const a = await createAppointment(patient.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(35) });
    await expect(updateAppointmentByStaff(admin.id, otherFacility.id, a.id, { status: "CONFIRMED" })).rejects.toMatchObject({ status: 404 });
  });

  it("lists upcoming appointments soonest first with status counts", async () => {
    const result = await listAppointmentsForStaff(facility.id, appointmentListQuerySchema.parse({}));
    const times = result.items.map((i) => i.scheduledAt.getTime());
    expect(times).toEqual([...times].sort((x, y) => x - y));
    expect(result.items.every((i) => i.facility.id === facility.id && i.scheduledAt.getTime() >= Date.now() - 86_400_000)).toBe(true);
    expect(result.counts.PENDING).toBeGreaterThan(0);
    const past = await listAppointmentsForStaff(facility.id, appointmentListQuerySchema.parse({ view: "past" }));
    expect(past.items.some((i) => i.reference === "AP-PAST01")).toBe(true);
  });
});

describe("patient cancellation", () => {
  it("cancels own future appointments only", async () => {
    const a = await createAppointment(patient.id, { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(40) });
    const stranger = await createUser("PATIENT");
    await expect(cancelPatientAppointment(stranger.id, a.id)).rejects.toMatchObject({ status: 404 });
    const cancelled = await cancelPatientAppointment(patient.id, a.id, "Travel changed");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledReason).toBe("Travel changed");
    await expect(cancelPatientAppointment(patient.id, a.id)).rejects.toMatchObject({ status: 400 });
  });
});
