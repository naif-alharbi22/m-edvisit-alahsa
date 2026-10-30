import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/** Records an audit entry. Failures are logged, never thrown. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log", { err, action: entry.action });
  }
}

export async function listAuditLogs(query: { page: number; pageSize: number; q?: string; entityType?: string }) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" } },
            { entityId: { contains: query.q } },
            { actor: { email: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
