import { prisma } from '../config/db.js';

export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  metadata?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
