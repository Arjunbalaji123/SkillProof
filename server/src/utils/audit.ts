import { prisma } from '../config/db.js';

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

