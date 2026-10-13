import { prisma } from '../config/db.js';
import { OpeningService } from './openingService.js';
import { SocketService } from './socketService.js';

const BATCH_SIZE = 200;
const DAILY_OPENING_NOTIFICATION_CAP = 5;

export class NotificationService {
  /**
   * Notifies all matching developers for a newly published opening.
   * - Processes matched developers in batches of 200.
   * - Capped at 5 OPENING_MATCH notifications per developer per day;
   *   extra openings beyond the cap are grouped into one digest notification.
   */
  static async notifyMatches(openingId: string) {
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        track: true,
        recruiter: {
          select: {
            id: true,
            name: true,
            recruiterProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
        skills: {
          include: {
            skillCatalog: true,
          },
        },
      },
    });

    if (!opening || opening.status !== 'ACTIVE') {
      return { matchedCount: 0, notifiedCount: 0 };
    }

    const matchedDevelopers = await OpeningService.findMatchingDevelopers(openingId);
    if (matchedDevelopers.length === 0) {
      return { matchedCount: 0, notifiedCount: 0 };
    }

    const companyName =
      opening.recruiter.recruiterProfile?.companyName || opening.recruiter.name || 'A recruiter';
    const skillNames = opening.skills.map((s) => s.skillCatalog.name).join(', ');
    const trackName = opening.track?.name || 'Technical Track';

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    let notifiedCount = 0;

    for (let i = 0; i < matchedDevelopers.length; i += BATCH_SIZE) {
      const batch = matchedDevelopers.slice(i, i + BATCH_SIZE);

      for (const dev of batch) {
        // Deduplicate on (userId, entityId, type) so retries never duplicate
        const existing = await prisma.notification.findFirst({
          where: {
            userId: dev.id,
            entityId: opening.id,
            type: 'OPENING_MATCH',
          },
        });
        if (existing) {
          continue;
        }

        const devMatchingScore = Math.round(
          Math.max(
            ...((dev as any).skills || []).map((s: any) => s.bestScore || 0),
            opening.minScore || 0
          )
        );

        const todaysMatches = await prisma.notification.findMany({
          where: {
            userId: dev.id,
            type: 'OPENING_MATCH',
            createdAt: { gte: startOfToday },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (todaysMatches.length < DAILY_OPENING_NOTIFICATION_CAP) {
          const notif = await prisma.notification.create({
            data: {
              userId: dev.id,
              type: 'OPENING_MATCH',
              title: `${companyName} is hiring: ${opening.title}`,
              body: `${companyName} is hiring for ${trackName}. Required skills: ${skillNames}. Your matching verified score: ${devMatchingScore}%.`,
              entityType: 'opening',
              entityId: opening.id,
            },
          });

          SocketService.emitToUser(dev.id, 'notification:new', { notification: notif });
          notifiedCount++;
        } else {
          // Group extra openings into one digest notification (keeping total at 5 for the day)
          const digestTarget =
            todaysMatches.find((n) => n.entityType.toLowerCase() === 'openingdigest') ||
            todaysMatches[DAILY_OPENING_NOTIFICATION_CAP - 1];

          let groupedCount = 2;
          if (
            digestTarget.entityType.toLowerCase() === 'openingdigest' &&
            digestTarget.entityId.startsWith('digest:')
          ) {
            const parts = digestTarget.entityId.split(':');
            const parsed = parseInt(parts[1] || '2', 10);
            groupedCount = Number.isNaN(parsed) ? 2 : parsed + 1;
          }

          const updatedDigest = await prisma.notification.update({
            where: { id: digestTarget.id },
            data: {
              title: `New opening matches digest (${groupedCount} openings)`,
              body: `You matched ${groupedCount} additional openings today including "${opening.title}" at ${companyName}. View all matching openings.`,
              entityType: 'opening',
              entityId: opening.id,
              readAt: null,
            },
          });

          SocketService.emitToUser(dev.id, 'notification:new', { notification: updatedDigest });
          notifiedCount++;
        }
      }
    }

    return {
      matchedCount: matchedDevelopers.length,
      notifiedCount,
    };
  }

  /**
   * Notifies a developer when their approach to an opening is accepted.
   */
  static async notifyApproachAccepted(
    developerId: string,
    openingTitle: string,
    companyName: string,
    conversationId: string
  ) {
    const notif = await prisma.notification.create({
      data: {
        userId: developerId,
        type: 'APPROACH_ACCEPTED',
        title: `Approach accepted: ${openingTitle}`,
        body: `${companyName} accepted your approach for "${openingTitle}". You can now chat directly.`,
        entityType: 'Conversation',
        entityId: conversationId,
      },
    });

    SocketService.emitToUser(developerId, 'notification:new', { notification: notif });
    return notif;
  }

  /**
   * Notifies a developer when their approach is declined ("not moving forward").
   */
  static async notifyApproachDeclined(
    developerId: string,
    openingTitle: string,
    companyName: string,
    openingId: string
  ) {
    const notif = await prisma.notification.create({
      data: {
        userId: developerId,
        type: 'APPROACH_DECLINED',
        title: `Update on "${openingTitle}"`,
        body: `${companyName} is not moving forward with your approach for "${openingTitle}" at this time.`,
        entityType: 'Opening',
        entityId: openingId,
      },
    });

    SocketService.emitToUser(developerId, 'notification:new', { notification: notif });
    return notif;
  }

  /**
   * Notifies a user of a new message.
   */
  static async notifyNewMessage(
    recipientId: string,
    senderName: string,
    conversationId: string,
    preview: string
  ) {
    const notif = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: `New message from ${senderName}`,
        body: preview.length > 140 ? `${preview.slice(0, 140)}...` : preview,
        entityType: 'Conversation',
        entityId: conversationId,
      },
    });

    SocketService.emitToUser(recipientId, 'notification:new', { notification: notif });
    return notif;
  }

  /**
   * Paginated notifications list for a user.
   */
  static async listNotifications(userId: string, cursor?: string, limit = 20) {
    const pageSize = Math.min(Math.max(1, limit), 50);

    const where: any = { userId };

    if (cursor) {
      const cursorNotif = await prisma.notification.findUnique({
        where: { id: cursor },
        select: { createdAt: true, id: true },
      });
      if (cursorNotif) {
        where.OR = [
          { createdAt: { lt: cursorNotif.createdAt } },
          { createdAt: cursorNotif.createdAt, id: { lt: cursorNotif.id } },
        ];
      }
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });

    let nextCursor: string | null = null;
    if (items.length > pageSize) {
      const extra = items.pop()!;
      nextCursor = extra.id;
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    return {
      notifications: items,
      nextCursor,
      unreadCount,
    };
  }

  /**
   * Returns unread notification count for the user.
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  /**
   * Marks a single notification as read (owner check enforced).
   */
  static async markRead(userId: string, notificationId: string) {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new Error('Notification not found');
    }
    if (notif.userId !== userId) {
      throw new Error('Access denied: not your notification');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: notif.readAt || new Date() },
    });

    return updated;
  }

  /**
   * Marks all notifications for the user as read.
   */
  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }
}

