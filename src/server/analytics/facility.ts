import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AnalyticsRange } from "@/lib/validators/common";
import { fillSeries, percentChange, rate, round2, topWithOther } from "./compute";
import { timeSeries } from "./queries";
import { resolveRange } from "./time";

export async function getFacilityAnalytics(facilityId: string, rangeKey: AnalyticsRange, now = new Date()) {
  const range = resolveRange(rangeKey, now);
  const inWindow = { facilityId, scheduledAt: { gte: range.start, lt: range.end } };
  const inPrev = { facilityId, scheduledAt: { gte: range.prevStart, lt: range.prevEnd } };
  const facilityFilter = Prisma.sql`"facilityId" = ${facilityId}`;

  const [
    facility,
    statusNow,
    statusPrev,
    revenueNow,
    revenuePrev,
    pending,
    patientsNow,
    patientsPrev,
    bySpecialty,
    byDoctor,
    doctors,
    seriesAll,
    seriesCompleted,
    seriesRevenue,
    upcoming,
    patientCountries,
  ] = await Promise.all([
    prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true, nameAr: true, rating: true, reviewCount: true } }),
    prisma.appointment.groupBy({ by: ["status"], where: inWindow, _count: true }),
    prisma.appointment.groupBy({ by: ["status"], where: inPrev, _count: true }),
    prisma.appointment.aggregate({ where: { ...inWindow, status: "COMPLETED" }, _sum: { price: true } }),
    prisma.appointment.aggregate({ where: { ...inPrev, status: "COMPLETED" }, _sum: { price: true } }),
    prisma.appointment.count({ where: { facilityId, status: "PENDING", scheduledAt: { gte: now } } }),
    prisma.appointment.findMany({ where: inWindow, distinct: ["userId"], select: { userId: true } }),
    prisma.appointment.findMany({ where: inPrev, distinct: ["userId"], select: { userId: true } }),
    prisma.appointment.groupBy({ by: ["specialty"], where: inWindow, _count: true }),
    prisma.appointment.groupBy({
      by: ["doctorId", "status"],
      where: { ...inWindow, doctorId: { not: null } },
      _count: true,
      _sum: { price: true },
    }),
    prisma.doctor.findMany({ where: { facilityId }, select: { id: true, name: true, nameAr: true, specialty: true, rating: true } }),
    timeSeries({ table: "Appointment", dateColumn: "scheduledAt", range, where: facilityFilter }),
    timeSeries({ table: "Appointment", dateColumn: "scheduledAt", range, where: Prisma.sql`${facilityFilter} AND status = 'COMPLETED'` }),
    timeSeries({
      table: "Appointment",
      dateColumn: "scheduledAt",
      range,
      valueSql: "COALESCE(SUM(price), 0)",
      where: Prisma.sql`${facilityFilter} AND status = 'COMPLETED'`,
    }),
    prisma.appointment.findMany({
      where: {
        facilityId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: now, lt: new Date(now.getTime() + 7 * 86_400_000) },
      },
      include: {
        user: { select: { name: true, nationality: true } },
        doctor: { select: { name: true, nameAr: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 8,
    }),
    prisma.$queryRaw<{ code: string | null; value: number }[]>(Prisma.sql`
      SELECT u.nationality AS code, COUNT(DISTINCT u.id)::int AS value
      FROM "Appointment" a JOIN "User" u ON u.id = a."userId"
      WHERE a."facilityId" = ${facilityId} AND a."scheduledAt" >= ${range.start} AND a."scheduledAt" < ${range.end}
      GROUP BY u.nationality
    `),
  ]);

  const count = (rows: { status: string; _count: number }[], s?: string) =>
    rows.filter((r) => !s || r.status === s).reduce((sum, r) => sum + r._count, 0);

  const total = count(statusNow);
  const totalPrev = count(statusPrev);
  const completed = count(statusNow, "COMPLETED");
  const noShow = count(statusNow, "NO_SHOW");
  const cancelled = count(statusNow, "CANCELLED");
  const resolved = completed + noShow + cancelled;
  const completedPrev = count(statusPrev, "COMPLETED");
  const resolvedPrev = completedPrev + count(statusPrev, "NO_SHOW") + count(statusPrev, "CANCELLED");
  const revenue = round2(revenueNow._sum.price ?? 0);
  const revenuePrevVal = round2(revenuePrev._sum.price ?? 0);

  const doctorStats = new Map<string, { appointments: number; completed: number; revenue: number }>();
  for (const row of byDoctor) {
    const id = row.doctorId!;
    const entry = doctorStats.get(id) ?? { appointments: 0, completed: 0, revenue: 0 };
    entry.appointments += row._count;
    if (row.status === "COMPLETED") {
      entry.completed += row._count;
      entry.revenue += row._sum.price ?? 0;
    }
    doctorStats.set(id, entry);
  }

  const completedSeries = fillSeries(range.buckets, seriesCompleted);
  const allSeries = fillSeries(range.buckets, seriesAll);
  const revenueSeries = fillSeries(range.buckets, seriesRevenue);

  return {
    range: rangeKey,
    granularity: range.granularity,
    facility,
    kpis: {
      appointments: { value: total, change: percentChange(total, totalPrev) },
      revenue: { value: revenue, change: percentChange(revenue, revenuePrevVal) },
      completionRate: {
        value: rate(completed, resolved),
        change: percentChange(rate(completed, resolved), rate(completedPrev, resolvedPrev)),
      },
      noShowRate: { value: rate(noShow, resolved) },
      uniquePatients: { value: patientsNow.length, change: percentChange(patientsNow.length, patientsPrev.length) },
      pendingRequests: { value: pending },
      avgVisitValue: { value: completed ? round2(revenue / completed) : 0 },
      rating: { value: facility?.rating ?? 0, reviews: facility?.reviewCount ?? 0 },
    },
    series: range.buckets.map((b, i) => ({
      key: b.key,
      completed: completedSeries[i]!.value,
      other: allSeries[i]!.value - completedSeries[i]!.value,
      revenue: revenueSeries[i]!.value,
    })),
    byStatus: statusNow.map((s) => ({ status: s.status, value: s._count })),
    bySpecialty: topWithOther(
      bySpecialty.map((s) => ({ label: s.specialty, value: s._count })),
      7
    ),
    byDoctor: doctors
      .map((d) => ({ ...d, ...(doctorStats.get(d.id) ?? { appointments: 0, completed: 0, revenue: 0 }) }))
      .filter((d) => d.appointments > 0)
      .sort((a, b) => b.appointments - a.appointments)
      .map((d) => ({ ...d, revenue: round2(d.revenue) })),
    byNationality: topWithOther(
      patientCountries.map((c) => ({ label: c.code ?? "__unknown__", value: Number(c.value) })),
      6
    ),
    upcoming: upcoming.map((a) => ({
      id: a.id,
      reference: a.reference,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      specialty: a.specialty,
      patient: a.user.name,
      nationality: a.user.nationality,
      doctor: a.doctor?.name ?? null,
      doctorAr: a.doctor?.nameAr ?? null,
    })),
  };
}

export type FacilityAnalytics = Awaited<ReturnType<typeof getFacilityAnalytics>>;
