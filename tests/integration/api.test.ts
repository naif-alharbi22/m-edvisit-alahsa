import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createDoctor, createFacility, createHotel, createRoomType, createUser, futureAt, isoDay } from "./factories";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>();
  return { ...actual, getServerSession: vi.fn(async () => (session.userId ? { user: { id: session.userId } } : null)) };
});

const { prisma } = await import("@/lib/prisma");
const health = await import("@/app/api/health/route");
const register = await import("@/app/api/auth/register/route");
const myAppointments = await import("@/app/api/me/appointments/route");
const myNotifications = await import("@/app/api/me/notifications/route");
const hospitalAppointments = await import("@/app/api/hospital/appointments/route");
const hospitalAppointment = await import("@/app/api/hospital/appointments/[id]/route");
const hospitalExport = await import("@/app/api/hospital/appointments/export/route");
const hospitalDoctors = await import("@/app/api/hospital/doctors/route");
const adminUser = await import("@/app/api/admin/users/[id]/route");
const adminUsers = await import("@/app/api/admin/users/route");
const availability = await import("@/app/api/hotels/[id]/availability/route");
const triage = await import("@/app/api/triage/route");

const BASE = "http://localhost:3000";
const req = (path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }) =>
  new NextRequest(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: init?.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });
const as = (user: { id: string } | null) => {
  session.userId = user?.id ?? null;
};

let facility: Awaited<ReturnType<typeof createFacility>>;
let otherFacility: Awaited<ReturnType<typeof createFacility>>;
let patient: Awaited<ReturnType<typeof createUser>>;
let hospitalAdmin: Awaited<ReturnType<typeof createUser>>;
let superAdmin: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  facility = await createFacility();
  otherFacility = await createFacility();
  await createDoctor(facility.id);
  patient = await createUser("PATIENT");
  hospitalAdmin = await createUser("HOSPITAL_ADMIN", { facilityId: facility.id });
  superAdmin = await createUser("SUPER_ADMIN");
});

beforeEach(() => as(null));

describe("public endpoints", () => {
  it("reports readiness including the database", async () => {
    const res = await health.GET(req("/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", database: "ok" });
  });

  it("validates registration input with field details", async () => {
    const bad = await register.POST(req("/api/auth/register", { method: "POST", body: { name: "A", email: "nope", password: "short" } }), undefined);
    expect(bad.status).toBe(400);
    const body = await bad.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(["name", "email", "password"]));

    const ok = await register.POST(req("/api/auth/register", { method: "POST", body: { name: "New Patient", email: "new@test.local", password: "abcd1234" } }), undefined);
    expect(ok.status).toBe(201);
    const dup = await register.POST(req("/api/auth/register", { method: "POST", body: { name: "New Patient", email: "NEW@test.local", password: "abcd1234" } }), undefined);
    expect(dup.status).toBe(409);
  });

  it("rejects malformed JSON", async () => {
    const res = await register.POST(req("/api/auth/register", { method: "POST", body: "{not json" }), undefined);
    expect(res.status).toBe(400);
  });

  it("validates availability queries", async () => {
    const hotel = await createHotel();
    await createRoomType(hotel.id);
    const bad = await availability.GET(req(`/api/hotels/${hotel.id}/availability?checkIn=${isoDay(5)}&checkOut=${isoDay(3)}`), ctx({ id: hotel.id }));
    expect(bad.status).toBe(400);
    const ok = await availability.GET(req(`/api/hotels/${hotel.id}/availability?checkIn=${isoDay(5)}&checkOut=${isoDay(7)}`), ctx({ id: hotel.id }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).nights).toBe(2);
  });

  it("returns 503 for AI triage when no API key is configured", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "r.pdf", { type: "application/pdf" }));
    const res = await triage.POST(new NextRequest(`${BASE}/api/triage`, { method: "POST", body: form }), undefined);
    expect(res.status).toBe(503);
  });
});

describe("authentication and authorization", () => {
  it("requires a session for patient endpoints", async () => {
    const res = await myAppointments.GET(req("/api/me/appointments"), undefined);
    expect(res.status).toBe(401);
  });

  it("lets patients book and list their appointments", async () => {
    as(patient);
    const created = await myAppointments.POST(
      req("/api/me/appointments", { method: "POST", body: { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(9).toISOString() } }),
      undefined
    );
    expect(created.status).toBe(201);
    const list = await (await myAppointments.GET(req("/api/me/appointments"), undefined)).json();
    expect(list.appointments).toHaveLength(1);

    const notifications = await (await myNotifications.GET(req("/api/me/notifications?locale=ar"), undefined)).json();
    expect(notifications.unread).toBeGreaterThan(0);
    expect(notifications.items[0].title).toMatch(/[؀-ۿ]/); // rendered in Arabic
  });

  it("forbids patients from staff endpoints", async () => {
    as(patient);
    expect((await hospitalAppointments.GET(req("/api/hospital/appointments"), undefined)).status).toBe(403);
    expect((await adminUsers.GET(req("/api/admin/users"), undefined)).status).toBe(403);
  });

  it("pins hospital admins to their facility", async () => {
    const foreign = await prisma.appointment.create({
      data: { reference: "AP-FOREIGN", userId: patient.id, facilityId: otherFacility.id, specialty: "Cardiology", scheduledAt: futureAt(11) },
    });
    as(hospitalAdmin);
    const list = await (await hospitalAppointments.GET(req(`/api/hospital/appointments?facilityId=${otherFacility.id}`), undefined)).json();
    expect(list.items.every((a: { facility: { id: string } }) => a.facility.id === facility.id)).toBe(true);

    const patch = await hospitalAppointment.PATCH(
      req(`/api/hospital/appointments/${foreign.id}`, { method: "PATCH", body: { status: "CONFIRMED" } }),
      ctx({ id: foreign.id })
    );
    expect(patch.status).toBe(404);

    // Super admins can act on any facility.
    as(superAdmin);
    const adminPatch = await hospitalAppointment.PATCH(
      req(`/api/hospital/appointments/${foreign.id}`, { method: "PATCH", body: { status: "CONFIRMED" } }),
      ctx({ id: foreign.id })
    );
    expect(adminPatch.status).toBe(200);
  });

  it("requires super admins to name the facility for catalog endpoints", async () => {
    as(superAdmin);
    expect((await hospitalDoctors.GET(req("/api/hospital/doctors"), undefined)).status).toBe(403);
    const ok = await hospitalDoctors.GET(req(`/api/hospital/doctors?facilityId=${facility.id}`), undefined);
    expect(ok.status).toBe(200);
    expect((await ok.json()).doctors).toHaveLength(1);
  });

  it("exports appointments as CSV", async () => {
    as(hospitalAdmin);
    const res = await hospitalExport.GET(req("/api/hospital/appointments/export?view=all"), undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="appointments-\d{4}-\d{2}-\d{2}\.csv"/);
    const text = await res.text();
    expect(text.split("\r\n")[0]).toContain("Reference,Status");
    expect(text).not.toContain("AP-FOREIGN");
  });

  it("protects admins from deactivating themselves and revokes deactivated users", async () => {
    as(superAdmin);
    const self = await adminUser.PATCH(req(`/api/admin/users/${superAdmin.id}`, { method: "PATCH", body: { isActive: false } }), ctx({ id: superAdmin.id }));
    expect(self.status).toBe(403);

    const victim = await createUser("PATIENT");
    const off = await adminUser.PATCH(req(`/api/admin/users/${victim.id}`, { method: "PATCH", body: { isActive: false } }), ctx({ id: victim.id }));
    expect(off.status).toBe(200);
    as(victim);
    expect((await myAppointments.GET(req("/api/me/appointments"), undefined)).status).toBe(401);
  });
});

describe("request hardening", () => {
  it("rejects cross-origin state-changing requests", async () => {
    as(patient);
    const res = await myAppointments.POST(
      req("/api/me/appointments", {
        method: "POST",
        body: { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(50).toISOString() },
        headers: { origin: "https://evil.example", host: "localhost:3000" },
      }),
      undefined
    );
    expect(res.status).toBe(403);
    const same = await myAppointments.POST(
      req("/api/me/appointments", {
        method: "POST",
        body: { facilityId: facility.id, specialty: "Cardiology", scheduledAt: futureAt(51).toISOString() },
        headers: { origin: "http://localhost:3000", host: "localhost:3000" },
      }),
      undefined
    );
    expect(same.status).toBe(201);
  });

  it("rejects oversized uploads before reading them", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    try {
      const res = await triage.POST(
        new NextRequest(`${BASE}/api/triage`, { method: "POST", headers: { "content-length": String(50 * 1024 * 1024) }, body: "x" }),
        undefined
      );
      expect(res.status).toBe(413);
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });
});
