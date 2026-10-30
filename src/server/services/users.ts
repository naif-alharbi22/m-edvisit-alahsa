import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { RegisterInput, ProfileInput } from "@/lib/validators/auth";
import type { AdminCreateUserInput, AdminUpdateUserInput, UserListQuery } from "@/lib/validators/user";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import { notify } from "./notifications";
import { recordAudit } from "./audit";

const BCRYPT_ROUNDS = 12;

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  locale: true,
  phone: true,
  nationality: true,
  isActive: true,
  facilityId: true,
  hotelId: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function registerPatient(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      phone: input.phone ?? null,
      nationality: input.nationality ?? null,
      locale: input.locale,
      role: "PATIENT",
    },
    select: publicUserSelect,
  });
  await notify(user.id, "welcome", { name: user.name?.split(" ")[0] ?? "" }, "/triage");
  return user;
}

export async function updateProfile(userId: string, input: ProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      nationality: input.nationality ?? null,
      locale: input.locale,
    },
    select: publicUserSelect,
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) throw new NotFoundError("User");
  if (!user.password) {
    throw new BadRequestError("This account signs in with Google and has no password to change");
  }
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new BadRequestError("Current password is incorrect");
  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });
  await recordAudit({ actorId: userId, action: "user.password_change", entityType: "User", entityId: userId });
}

// ─── Administration ─────────────────────────────────────────────────────────

export async function listUsers(query: UserListQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...publicUserSelect,
        facility: { select: { id: true, name: true } },
        hotel: { select: { id: true, name: true } },
        _count: { select: { appointments: true, hotelBookings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

async function assertAssignmentTargets(facilityId?: string | null, hotelId?: string | null) {
  if (facilityId) {
    const exists = await prisma.facility.count({ where: { id: facilityId } });
    if (!exists) throw new BadRequestError("Selected facility does not exist");
  }
  if (hotelId) {
    const exists = await prisma.hotel.count({ where: { id: hotelId } });
    if (!exists) throw new BadRequestError("Selected hotel does not exist");
  }
}

export async function createStaffUser(actorId: string, input: AdminCreateUserInput, ipAddress?: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ConflictError("An account with this email already exists");
  await assertAssignmentTargets(input.facilityId, input.hotelId);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      role: input.role,
      facilityId: input.role === "HOSPITAL_ADMIN" ? input.facilityId : null,
      hotelId: input.role === "HOTEL_MANAGER" ? input.hotelId : null,
    },
    select: publicUserSelect,
  });
  await recordAudit({
    actorId,
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress,
  });
  return user;
}

export async function updateUserByAdmin(actorId: string, userId: string, input: AdminUpdateUserInput, ipAddress?: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, facilityId: true, hotelId: true } });
  if (!target) throw new NotFoundError("User");

  if (userId === actorId) {
    if (input.isActive === false) throw new ForbiddenError("You cannot deactivate your own account");
    if (input.role && input.role !== "SUPER_ADMIN") throw new ForbiddenError("You cannot remove your own administrator role");
  }

  const role = input.role ?? target.role;
  const facilityId = input.facilityId !== undefined ? input.facilityId : target.facilityId;
  const hotelId = input.hotelId !== undefined ? input.hotelId : target.hotelId;

  if (role === "HOSPITAL_ADMIN" && !facilityId) throw new BadRequestError("Hospital admins must be assigned to a facility");
  if (role === "HOTEL_MANAGER" && !hotelId) throw new BadRequestError("Hotel managers must be assigned to a hotel");
  await assertAssignmentTargets(role === "HOSPITAL_ADMIN" ? facilityId : null, role === "HOTEL_MANAGER" ? hotelId : null);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      role,
      facilityId: role === "HOSPITAL_ADMIN" ? facilityId : null,
      hotelId: role === "HOTEL_MANAGER" ? hotelId : null,
    },
    select: publicUserSelect,
  });

  await recordAudit({
    actorId,
    action: "user.update",
    entityType: "User",
    entityId: userId,
    metadata: JSON.parse(JSON.stringify(input)),
    ipAddress,
  });
  return updated;
}
