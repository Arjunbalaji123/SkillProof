import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { OpeningService } from './openingService.js';
import { NotificationService } from './notificationService.js';
import { SocketService } from './socketService.js';

export class MessageError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DAILY_DIRECT_CONVERSATION_LIMIT = 10;
const DAILY_APPROACH_LIMIT = 5;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_APPROACH_MESSAGE_LENGTH = 500;
const DEFAULT_PAGE_SIZE = 30;

/**
 * Strips ASCII control characters (except \n and \t) and trims whitespace.
 * Keeps plain text intact so HTML tags are stored literally and escaped on render.
 */
export function sanitizePlainTextMessage(raw: string, maxLength = MAX_MESSAGE_LENGTH): string {
  if (typeof raw !== 'string') {
    throw new MessageError('Message body must be a string', 400);
  }
  const stripped = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!stripped) {
    throw new MessageError('Message body cannot be empty', 400);
  }
  if (stripped.length > maxLength) {
    throw new MessageError(`Message body cannot exceed ${maxLength} characters`, 400);
  }
  return stripped;
}

export class MessageService {
  /**
   * Computes whether the given participant can send a message in the conversation,
   * and returns the exact human-readable banner reason if disabled.
   */
  static computeComposerState(
    userId: string,
    conversation: {
      recruiterId: string;
      developerId: string;
      origin: string;
      status: string;
      unlockedAt: Date | null;
      opening?: { id: string; title: string; status: string } | null;
    },
    options: {
      isBlocked: boolean;
      latestApproachStatus?: string | null;
      recruiterIsVerified?: boolean;
    }
  ): { canSend: boolean; disabledReason: string | null } {
    if (options.isBlocked || conversation.status === 'BLOCKED') {
      return {
        canSend: false,
        disabledReason: 'Messaging is disabled because a block is active between participants.',
      };
    }

    const isRecruiter = userId === conversation.recruiterId;
    const isDeveloper = userId === conversation.developerId;

    if (!isRecruiter && !isDeveloper) {
      return { canSend: false, disabledReason: 'Not a participant in this conversation.' };
    }

    if (isRecruiter) {
      if (options.recruiterIsVerified === false) {
        return {
          canSend: false,
          disabledReason: 'Your recruiter account is pending approval',
        };
      }
      return { canSend: true, disabledReason: null };
    }

    // Developer rules
    if (conversation.status === 'CLOSED') {
      return {
        canSend: false,
        disabledReason: 'This conversation was closed by the recruiter',
      };
    }

    if (conversation.origin === 'DIRECT') {
      if (conversation.status === 'ACTIVE') {
        return { canSend: true, disabledReason: null };
      }
      return {
        canSend: false,
        disabledReason: 'This conversation was closed by the recruiter',
      };
    }

    // OPENING origin
    if (options.latestApproachStatus === 'DECLINED') {
      return {
        canSend: false,
        disabledReason: 'Approach declined',
      };
    }

    if (conversation.status === 'ACTIVE' && conversation.unlockedAt !== null) {
      return { canSend: true, disabledReason: null };
    }

    if (
      conversation.opening &&
      (conversation.opening.status === 'CLOSED' || conversation.opening.status === 'EXPIRED')
    ) {
      return {
        canSend: false,
        disabledReason: 'This opening has closed',
      };
    }

    return {
      canSend: false,
      disabledReason: 'Waiting for the recruiter to respond to your approach',
    };
  }

  /**
   * Path A (OPENING): A developer approaches a recruiter through an active, matching opening.
   * - Only when opening is ACTIVE and not expired
   * - Developer must match the opening
   * - No earlier Approach on this opening
   * - Fewer than 5 approaches today
   * - Rejects recruiter, admin, suspended, and demo accounts
   * - Creates Approach (PENDING) and Conversation (origin OPENING, status PENDING_APPROVAL) with intro message
   */
  static async approachOpening(developerId: string, openingId: string, rawMessage: string) {
    const cleanMessage = sanitizePlainTextMessage(rawMessage, MAX_APPROACH_MESSAGE_LENGTH);

    const developer = await prisma.user.findUnique({
      where: { id: developerId },
      include: { profile: true },
    });

    if (!developer) {
      throw new MessageError('User not found', 404);
    }
    if (developer.role !== 'DEVELOPER') {
      throw new MessageError('Only developers can approach job openings', 403);
    }
    if (developer.isDemo) {
      throw new MessageError('Demo accounts cannot approach openings', 403);
    }
    if (developer.status === 'SUSPENDED') {
      throw new MessageError('Suspended accounts cannot approach openings', 403);
    }

    await OpeningService.expireOverdueOpenings();

    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            username: true,
            status: true,
          },
        },
      },
    });

    if (!opening) {
      throw new MessageError('Opening not found', 404);
    }

    if (opening.status !== 'ACTIVE' || new Date(opening.expiresAt) <= new Date()) {
      throw new MessageError('This opening is no longer accepting approaches', 400);
    }

    // Check if already approached this opening
    const existingApproach = await prisma.approach.findUnique({
      where: {
        openingId_developerId: {
          openingId,
          developerId,
        },
      },
    });

    if (existingApproach) {
      throw new MessageError('You have already approached this opening', 409);
    }

    // Check daily approach limit (5 per developer per day)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const approachesToday = await prisma.approach.count({
      where: {
        developerId,
        createdAt: { gte: startOfToday },
      },
    });

    if (approachesToday >= DAILY_APPROACH_LIMIT) {
      throw new MessageError('Daily limit of 5 approaches per day reached', 429);
    }

    // Check block in either direction
    const blockExists = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: developerId, blockedId: opening.recruiterId },
          { blockerId: opening.recruiterId, blockedId: developerId },
        ],
      },
    });

    if (blockExists) {
      throw new MessageError('You cannot approach this recruiter due to a block', 403);
    }

    // Verify developer matches the opening
    const isMatch = await OpeningService.doesDeveloperMatchOpening(developerId, openingId);
    if (!isMatch) {
      throw new MessageError(
        'You do not match the verified skill, score, or interest requirements for this opening',
        403
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const approach = await tx.approach.create({
        data: {
          openingId,
          developerId,
          message: cleanMessage,
          status: 'PENDING',
        },
      });

      const existingConv = await tx.conversation.findUnique({
        where: {
          recruiterId_developerId: {
            recruiterId: opening.recruiterId,
            developerId,
          },
        },
      });

      let conversation;
      if (!existingConv) {
        conversation = await tx.conversation.create({
          data: {
            recruiterId: opening.recruiterId,
            developerId,
            origin: 'OPENING',
            openingId,
            status: 'PENDING_APPROVAL',
            unlockedAt: null,
            lastMessageAt: now,
            participants: {
              create: [
                {
                  userId: developerId,
                  lastReadAt: now,
                  muted: false,
                  archived: false,
                },
                {
                  userId: opening.recruiterId,
                  lastReadAt: null,
                  muted: false,
                  archived: false,
                },
              ],
            },
          },
        });
      } else {
        // Keep ACTIVE if already unlocked with this recruiter; otherwise set PENDING_APPROVAL and update openingId
        const keepActive = existingConv.status === 'ACTIVE' && existingConv.unlockedAt !== null;
        conversation = await tx.conversation.update({
          where: { id: existingConv.id },
          data: {
            openingId: existingConv.openingId || openingId,
            status: keepActive ? 'ACTIVE' : 'PENDING_APPROVAL',
            lastMessageAt: now,
          },
        });

        await tx.conversationParticipant.updateMany({
          where: { conversationId: existingConv.id },
          data: { archived: false },
        });
        await tx.conversationParticipant.updateMany({
          where: { conversationId: existingConv.id, userId: developerId },
          data: { lastReadAt: now },
        });
      }

      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: developerId,
          body: cleanMessage,
        },
      });

      return { approach, conversation, message };
    });

    await logAudit(developerId, 'OPENING_APPROACHED', 'Approach', result.approach.id, {
      openingId,
      recruiterId: opening.recruiterId,
      conversationId: result.conversation.id,
    });

    const formattedMessage = {
      id: result.message.id,
      conversationId: result.conversation.id,
      senderId: developerId,
      senderName: developer.name,
      senderUsername: developer.username,
      body: result.message.body,
      createdAt: result.message.createdAt,
      deletedAt: null,
    };

    SocketService.emitToUser(opening.recruiterId, 'message:new', {
      conversationId: result.conversation.id,
      message: formattedMessage,
    });
    SocketService.emitToUser(opening.recruiterId, 'conversation:updated', {
      conversationId: result.conversation.id,
    });

    // DEV-ONLY AUTO-RESPONDER for seeded recruiters (refused in production)
    if (
      process.env.SEED_RECRUITER_AUTOREPLY === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const recruiterUser = await prisma.user.findUnique({
        where: { id: opening.recruiterId },
        select: { id: true, isSeed: true },
      });

      if (recruiterUser?.isSeed) {
        setTimeout(async () => {
          try {
            const currentApproach = await prisma.approach.findUnique({
              where: { id: result.approach.id },
            });
            if (currentApproach && currentApproach.status === 'PENDING') {
              const decision = await MessageService.decideApproach(
                opening.recruiterId,
                result.approach.id,
                'ACCEPTED'
              );
              if (decision.conversationId) {
                await MessageService.sendMessage(
                  opening.recruiterId,
                  decision.conversationId,
                  "Thanks for reaching out! Let's talk."
                );
              }
            }
          } catch (autoErr) {
            console.error('[AutoResponder] Failed to auto-reply to approach:', autoErr);
          }
        }, 10000).unref?.();
      }
    }

    return {
      approach: result.approach,
      conversationId: result.conversation.id,
      conversationStatus: result.conversation.status,
      message: formattedMessage,
    };
  }

  /**
   * Recruiter decides on a developer's Approach: ACCEPTED | DECLINED | SAVED.
   * - ACCEPTED -> Conversation status ACTIVE, unlockedAt set, developer notified
   * - DECLINED -> developer notified ("not moving forward"), conversation stays closed/locked
   * - SAVED -> Approach status SAVED, no conversation change
   */
  static async decideApproach(
    recruiterId: string,
    approachId: string,
    decision: 'ACCEPTED' | 'DECLINED' | 'SAVED'
  ) {
    if (!['ACCEPTED', 'DECLINED', 'SAVED'].includes(decision)) {
      throw new MessageError('Decision must be ACCEPTED, DECLINED, or SAVED', 400);
    }

    const approach = await prisma.approach.findUnique({
      where: { id: approachId },
      include: {
        opening: {
          include: {
            recruiter: {
              select: {
                id: true,
                name: true,
                recruiterProfile: {
                  select: { companyName: true, isVerified: true },
                },
              },
            },
          },
        },
      },
    });

    if (!approach) {
      throw new MessageError('Approach not found', 404);
    }

    if (approach.opening.recruiterId !== recruiterId) {
      throw new MessageError('Only the opening owner can decide on this approach', 403);
    }

    const now = new Date();
    const companyName =
      approach.opening.recruiter.recruiterProfile?.companyName ||
      approach.opening.recruiter.name ||
      'Recruiter';

    const existingConv = await prisma.conversation.findUnique({
      where: {
        recruiterId_developerId: {
          recruiterId,
          developerId: approach.developerId,
        },
      },
    });

    let updatedApproach;
    let updatedConv = existingConv;

    if (decision === 'ACCEPTED') {
      const txResult = await prisma.$transaction(async (tx) => {
        const app = await tx.approach.update({
          where: { id: approachId },
          data: {
            status: 'ACCEPTED',
            decidedAt: now,
          },
        });

        let conv;
        if (existingConv) {
          conv = await tx.conversation.update({
            where: { id: existingConv.id },
            data: {
              status: 'ACTIVE',
              unlockedAt: existingConv.unlockedAt || now,
              openingId: approach.openingId,
            },
          });
        } else {
          conv = await tx.conversation.create({
            data: {
              recruiterId,
              developerId: approach.developerId,
              origin: 'OPENING',
              openingId: approach.openingId,
              status: 'ACTIVE',
              unlockedAt: now,
              lastMessageAt: now,
              participants: {
                create: [
                  { userId: recruiterId, lastReadAt: now, muted: false, archived: false },
                  { userId: approach.developerId, lastReadAt: null, muted: false, archived: false },
                ],
              },
            },
          });
        }

        return { app, conv };
      });

      updatedApproach = txResult.app;
      updatedConv = txResult.conv;

      await NotificationService.notifyApproachAccepted(
        approach.developerId,
        approach.opening.title,
        companyName,
        updatedConv.id
      );

      SocketService.emitToUser(approach.developerId, 'conversation:updated', {
        conversationId: updatedConv.id,
        status: 'ACTIVE',
      });
    } else if (decision === 'DECLINED') {
      updatedApproach = await prisma.approach.update({
        where: { id: approachId },
        data: {
          status: 'DECLINED',
          decidedAt: now,
        },
      });

      // Conversation stays closed/locked unless it was previously unlocked via another accepted path
      if (existingConv && !existingConv.unlockedAt) {
        updatedConv = await prisma.conversation.update({
          where: { id: existingConv.id },
          data: {
            status: 'PENDING_APPROVAL',
            unlockedAt: null,
          },
        });
      }

      await NotificationService.notifyApproachDeclined(
        approach.developerId,
        approach.opening.title,
        companyName,
        approach.openingId
      );

      if (existingConv) {
        SocketService.emitToUser(approach.developerId, 'conversation:updated', {
          conversationId: existingConv.id,
          status: 'DECLINED',
        });
      }
    } else {
      // SAVED
      updatedApproach = await prisma.approach.update({
        where: { id: approachId },
        data: {
          status: 'SAVED',
        },
      });
    }

    await logAudit(recruiterId, 'APPROACH_DECIDED', 'Approach', approachId, {
      decision,
      openingId: approach.openingId,
      developerId: approach.developerId,
      conversationId: updatedConv?.id || null,
    });

    return {
      approach: updatedApproach,
      conversationId: updatedConv?.id || null,
      conversationStatus: updatedConv?.status || null,
    };
  }

  /**
   * Path B (DIRECT exception): A verified recruiter starts a conversation with a specific eligible developer.
   * - RECRUITER sender and DEVELOPER recipient only (403 "Only recruiters can start direct conversations" otherwise)
   * - Recruiter must have recruiterProfile.isVerified = true
   * - Developer must be isPublic, have >= 1 VERIFIED skill, allowRecruiterMessages = true, not suspended, not isDemo, and no block
   * - Limit: 10 new DIRECT conversations per recruiter per day
   */
  static async startDirectConversation(
    senderId: string,
    developerIdentifier: string,
    firstMessage: string,
    reason?: string
  ) {
    const cleanBody = sanitizePlainTextMessage(firstMessage, MAX_MESSAGE_LENGTH);
    const cleanReason = reason ? sanitizePlainTextMessage(reason, 300) : null;

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { recruiterProfile: true },
    });

    if (!sender) {
      throw new MessageError('Sender not found', 404);
    }

    // Core rule: Only recruiters can start direct conversations
    if (sender.role !== 'RECRUITER') {
      throw new MessageError('Only recruiters can start direct conversations', 403);
    }

    if (sender.status === 'SUSPENDED') {
      throw new MessageError('Suspended accounts cannot start conversations', 403);
    }

    if (sender.isDemo) {
      throw new MessageError('Demo accounts cannot start conversations', 403);
    }

    if (!sender.recruiterProfile || !sender.recruiterProfile.isVerified) {
      throw new MessageError('Your recruiter account is pending approval and cannot send messages', 403);
    }

    const trimmedIdentifier = String(developerIdentifier || '').trim();
    if (!trimmedIdentifier) {
      throw new MessageError('developerUsername is required', 400);
    }

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedIdentifier.toLowerCase() },
          { id: trimmedIdentifier },
        ],
      },
      include: {
        profile: true,
        skills: {
          where: { status: 'VERIFIED' },
          select: { id: true, language: true, bestScore: true },
        },
      },
    });

    if (!recipient) {
      throw new MessageError('Recipient user not found', 404);
    }

    if (recipient.id === senderId) {
      throw new MessageError('You cannot message yourself', 400);
    }

    if (recipient.role !== 'DEVELOPER') {
      throw new MessageError('Only recruiters can start direct conversations', 403);
    }

    if (recipient.isDemo) {
      throw new MessageError('Demo accounts cannot be messaged', 403);
    }

    if (recipient.status === 'SUSPENDED') {
      throw new MessageError('Cannot message a suspended user', 403);
    }

    if (!recipient.profile || !recipient.profile.isPublic) {
      throw new MessageError('This developer does not have a public profile', 403);
    }

    if (!recipient.profile.allowRecruiterMessages) {
      throw new MessageError('This developer has opted out of direct recruiter messages', 403);
    }

    if (recipient.skills.length === 0) {
      throw new MessageError(
        'Recruiters can only message developers with at least one verified skill',
        403
      );
    }

    // Check block in either direction
    const blockExists = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: recipient.id },
          { blockerId: recipient.id, blockedId: senderId },
        ],
      },
    });

    if (blockExists) {
      throw new MessageError('Cannot message this developer due to a block', 403);
    }

    const existingConv = await prisma.conversation.findUnique({
      where: {
        recruiterId_developerId: {
          recruiterId: senderId,
          developerId: recipient.id,
        },
      },
    });

    if (!existingConv) {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const newDirectToday = await prisma.conversation.count({
        where: {
          initiatedByRecruiterId: senderId,
          origin: 'DIRECT',
          createdAt: { gte: startOfToday },
        },
      });

      if (newDirectToday >= DAILY_DIRECT_CONVERSATION_LIMIT) {
        throw new MessageError(
          'Daily limit of 10 new direct conversations per day reached',
          429
        );
      }
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      let conv;
      if (!existingConv) {
        conv = await tx.conversation.create({
          data: {
            recruiterId: senderId,
            developerId: recipient.id,
            origin: 'DIRECT',
            initiatedByRecruiterId: senderId,
            directReason: cleanReason,
            status: 'ACTIVE',
            unlockedAt: now,
            lastMessageAt: now,
            participants: {
              create: [
                { userId: senderId, lastReadAt: now, muted: false, archived: false },
                { userId: recipient.id, lastReadAt: null, muted: false, archived: false },
              ],
            },
          },
        });
      } else {
        conv = await tx.conversation.update({
          where: { id: existingConv.id },
          data: {
            status: 'ACTIVE',
            unlockedAt: existingConv.unlockedAt || now,
            initiatedByRecruiterId: existingConv.initiatedByRecruiterId || senderId,
            directReason: cleanReason || existingConv.directReason,
            lastMessageAt: now,
          },
        });

        await tx.conversationParticipant.updateMany({
          where: { conversationId: existingConv.id },
          data: { archived: false },
        });
        await tx.conversationParticipant.updateMany({
          where: { conversationId: existingConv.id, userId: senderId },
          data: { lastReadAt: now },
        });
      }

      const message = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId,
          body: cleanBody,
        },
      });

      return { conv, message };
    });

    await logAudit(
      senderId,
      existingConv ? 'MESSAGE_SENT' : 'DIRECT_CONVERSATION_STARTED',
      'Conversation',
      result.conv.id,
      {
        developerId: recipient.id,
        directReason: cleanReason,
        messageId: result.message.id,
      }
    );

    await NotificationService.notifyNewMessage(
      recipient.id,
      sender.recruiterProfile.companyName
        ? `${sender.name} (${sender.recruiterProfile.companyName})`
        : sender.name,
      result.conv.id,
      cleanBody
    );

    const formattedMessage = {
      id: result.message.id,
      conversationId: result.conv.id,
      senderId,
      senderName: sender.name,
      senderUsername: sender.username,
      body: result.message.body,
      createdAt: result.message.createdAt,
      deletedAt: null,
    };

    SocketService.emitToUser(recipient.id, 'message:new', {
      conversationId: result.conv.id,
      message: formattedMessage,
    });
    SocketService.emitToUser(recipient.id, 'conversation:updated', {
      conversationId: result.conv.id,
    });
    SocketService.emitToUser(senderId, 'conversation:updated', {
      conversationId: result.conv.id,
    });

    return {
      conversationId: result.conv.id,
      origin: result.conv.origin,
      status: result.conv.status,
      message: formattedMessage,
    };
  }

  /**
   * Sends a message in an existing conversation.
   * - Developer may send ONLY if (a) DIRECT and ACTIVE, or (b) from ACCEPTED approach and ACTIVE
   * - If recruiter closed the conversation or blocked the developer, developer cannot send
   * - If recruiter sends in a CLOSED conversation (and not blocked), it reopens to ACTIVE
   */
  static async sendMessage(senderId: string, conversationId: string, rawBody: string) {
    const cleanBody = sanitizePlainTextMessage(rawBody, MAX_MESSAGE_LENGTH);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        opening: {
          select: { id: true, title: true, status: true },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            username: true,
            status: true,
            isDemo: true,
            recruiterProfile: {
              select: { companyName: true, isVerified: true },
            },
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
            username: true,
            status: true,
            isDemo: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new MessageError('Conversation not found', 404);
    }

    const isRecruiter = senderId === conversation.recruiterId;
    const isDeveloper = senderId === conversation.developerId;

    if (!isRecruiter && !isDeveloper) {
      throw new MessageError('Access denied: you are not a participant in this conversation', 403);
    }

    const sender = isRecruiter ? conversation.recruiter : conversation.developer;
    const recipient = isRecruiter ? conversation.developer : conversation.recruiter;

    if (sender.status === 'SUSPENDED' || recipient.status === 'SUSPENDED') {
      throw new MessageError('Cannot send messages when a participant is suspended', 403);
    }

    if (sender.isDemo || recipient.isDemo) {
      throw new MessageError('Demo accounts cannot send or receive messages', 403);
    }

    // Check block in either direction
    const blockExists = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: conversation.recruiterId, blockedId: conversation.developerId },
          { blockerId: conversation.developerId, blockedId: conversation.recruiterId },
        ],
      },
    });

    if (blockExists || conversation.status === 'BLOCKED') {
      throw new MessageError('Cannot send messages because a block is active', 403);
    }

    if (isDeveloper) {
      if (conversation.status === 'CLOSED') {
        throw new MessageError('This conversation was closed by the recruiter', 403);
      }

      if (conversation.origin === 'DIRECT') {
        if (conversation.status !== 'ACTIVE') {
          throw new MessageError('This conversation is not active', 403);
        }
      } else {
        // OPENING origin: requires ACCEPTED approach / unlocked conversation
        const acceptedApproach = await prisma.approach.findFirst({
          where: {
            developerId: conversation.developerId,
            opening: { recruiterId: conversation.recruiterId },
            status: 'ACCEPTED',
          },
        });

        if (conversation.status !== 'ACTIVE' || (!conversation.unlockedAt && !acceptedApproach)) {
          const declinedApproach = await prisma.approach.findFirst({
            where: {
              developerId: conversation.developerId,
              opening: { recruiterId: conversation.recruiterId },
              status: 'DECLINED',
            },
          });
          if (declinedApproach) {
            throw new MessageError('Approach declined', 403);
          }
          throw new MessageError('Waiting for the recruiter to respond to your approach', 403);
        }
      }
    } else {
      // Recruiter sending
      if (!conversation.recruiter.recruiterProfile?.isVerified) {
        throw new MessageError('Your recruiter account is pending approval', 403);
      }
    }

    const now = new Date();

    const message = await prisma.$transaction(async (tx) => {
      // If recruiter sends a message in a CLOSED or PENDING_APPROVAL conversation, re-open/unlock it
      const shouldActivate =
        isRecruiter && (conversation.status === 'CLOSED' || conversation.status === 'PENDING_APPROVAL');

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          ...(shouldActivate
            ? {
                status: 'ACTIVE',
                unlockedAt: conversation.unlockedAt || now,
              }
            : {}),
        },
      });

      await tx.conversationParticipant.updateMany({
        where: { conversationId },
        data: { archived: false },
      });

      await tx.conversationParticipant.updateMany({
        where: { conversationId, userId: senderId },
        data: { lastReadAt: now },
      });

      return tx.message.create({
        data: {
          conversationId,
          senderId,
          body: cleanBody,
        },
      });
    });

    await logAudit(senderId, 'MESSAGE_SENT', 'Message', message.id, {
      conversationId,
      recipientId: recipient.id,
    });

    // Check if recipient muted conversation before creating notification
    const recipientPart = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: recipient.id,
        },
      },
    });

    if (!recipientPart?.muted) {
      await NotificationService.notifyNewMessage(
        recipient.id,
        sender.name,
        conversationId,
        cleanBody
      );
    }

    const formattedMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: sender.name,
      senderUsername: sender.username,
      body: message.body,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt,
    };

    SocketService.emitToUser(recipient.id, 'message:new', {
      conversationId,
      message: formattedMessage,
    });
    SocketService.emitToUser(recipient.id, 'conversation:updated', {
      conversationId,
    });
    SocketService.emitToUser(senderId, 'conversation:updated', {
      conversationId,
    });

    return formattedMessage;
  }

  /**
   * Recruiter closes a conversation (disables developer's composer until recruiter messages again).
   */
  static async closeConversation(recruiterId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new MessageError('Conversation not found', 404);
    }

    if (conversation.recruiterId !== recruiterId) {
      throw new MessageError('Only the recruiter in this conversation can close it', 403);
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });

    await logAudit(recruiterId, 'CONVERSATION_CLOSED', 'Conversation', conversationId, {
      developerId: conversation.developerId,
    });

    SocketService.emitToUser(conversation.developerId, 'conversation:updated', {
      conversationId,
      status: 'CLOSED',
    });
    SocketService.emitToUser(recruiterId, 'conversation:updated', {
      conversationId,
      status: 'CLOSED',
    });

    return { conversationId, status: updated.status };
  }

  /**
   * Lists all non-archived conversations for the current user.
   * Never exposes email or passwordHash.
   */
  static async listConversations(userId: string) {
    const participantRows = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        archived: false,
      },
      include: {
        conversation: {
          include: {
            opening: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
            recruiter: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isDemo: true,
                status: true,
                recruiterProfile: {
                  select: {
                    companyName: true,
                    jobTitle: true,
                    companyWebsite: true,
                    linkedinUrl: true,
                    bio: true,
                    isVerified: true,
                  },
                },
              },
            },
            developer: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isDemo: true,
                status: true,
                profile: {
                  select: {
                    bio: true,
                    githubUrl: true,
                  },
                },
                skills: {
                  where: { status: 'VERIFIED' },
                  orderBy: { bestScore: 'desc' },
                  take: 3,
                  select: {
                    language: true,
                    bestScore: true,
                    claimedLevel: true,
                  },
                },
              },
            },
            participants: true,
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc',
        },
      },
    });

    // Load user blocks for this user
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    const blockedPartnerIds = new Set(
      blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))
    );
    const blockedByMeIds = new Set(
      blocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId)
    );

    const results = [];

    for (const row of participantRows) {
      const conv = row.conversation;
      const isRecruiter = userId === conv.recruiterId;
      const otherRaw = isRecruiter ? conv.developer : conv.recruiter;
      const otherParticipant = conv.participants.find((p) => p.userId !== userId);

      // Count unread messages sent by the other participant
      const unreadWhere: any = {
        conversationId: conv.id,
        senderId: { not: userId },
        deletedAt: null,
      };
      if (row.lastReadAt) {
        unreadWhere.createdAt = { gt: row.lastReadAt };
      }
      const unreadCount = await prisma.message.count({ where: unreadWhere });

      // Find latest approach between this developer and recruiter if OPENING origin
      let latestApproach = null;
      if (conv.origin === 'OPENING') {
        latestApproach = await prisma.approach.findFirst({
          where: {
            developerId: conv.developerId,
            ...(conv.openingId
              ? { openingId: conv.openingId }
              : { opening: { recruiterId: conv.recruiterId } }),
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      const isBlocked = blockedPartnerIds.has(otherRaw.id);
      const composerState = this.computeComposerState(userId, conv, {
        isBlocked,
        latestApproachStatus: latestApproach?.status || null,
        recruiterIsVerified: conv.recruiter.recruiterProfile?.isVerified ?? false,
      });

      const recruiterDisplayName = conv.recruiter.recruiterProfile?.companyName
        ? `${conv.recruiter.name} (${conv.recruiter.recruiterProfile.companyName})`
        : conv.recruiter.name;

      const label =
        conv.origin === 'OPENING' && conv.opening
          ? `From opening: ${conv.opening.title}`
          : `Direct message from ${recruiterDisplayName}`;

      const lastMsg = conv.messages[0] || null;

      results.push({
        id: conv.id,
        origin: conv.origin,
        status: conv.status,
        unlockedAt: conv.unlockedAt,
        directReason: conv.directReason,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        label,
        opening: conv.opening
          ? {
              id: conv.opening.id,
              title: conv.opening.title,
              status: conv.opening.status,
            }
          : null,
        approach: latestApproach
          ? {
              id: latestApproach.id,
              status: latestApproach.status,
              openingId: latestApproach.openingId,
            }
          : null,
        myStatus: conv.status,
        muted: row.muted,
        archived: row.archived,
        lastReadAt: row.lastReadAt,
        otherLastReadAt: otherParticipant?.lastReadAt || null,
        unreadCount,
        isBlockedByMe: blockedByMeIds.has(otherRaw.id),
        isBlocked,
        composerState,
        otherUser: isRecruiter
          ? {
              id: conv.developer.id,
              name: conv.developer.name,
              username: conv.developer.username,
              role: conv.developer.role,
              isDemo: Boolean(conv.developer.isDemo),
              bio: conv.developer.profile?.bio || null,
              avatarUrl: null,
              verifiedSkills: conv.developer.skills.map((s) => ({
                language: s.language,
                score: s.bestScore,
                level: s.claimedLevel,
              })),
            }
          : {
              id: conv.recruiter.id,
              name: conv.recruiter.name,
              username: conv.recruiter.username,
              role: conv.recruiter.role,
              isDemo: Boolean(conv.recruiter.isDemo),
              companyName: conv.recruiter.recruiterProfile?.companyName || '',
              jobTitle: conv.recruiter.recruiterProfile?.jobTitle || '',
              isVerified: Boolean(conv.recruiter.recruiterProfile?.isVerified),
              bio: conv.recruiter.recruiterProfile?.bio || null,
              avatarUrl: null,
              verifiedSkills: [],
            },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              senderId: lastMsg.senderId,
              body: lastMsg.body,
              createdAt: lastMsg.createdAt,
            }
          : null,
      });
    }

    return results;
  }

  /**
   * Returns paginated messages (30 per page) for a conversation.
   * Enforces strict participant check.
   */
  static async getConversationMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE
  ) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        opening: {
          select: { id: true, title: true, status: true },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            isDemo: true,
            status: true,
            recruiterProfile: {
              select: {
                companyName: true,
                jobTitle: true,
                companyWebsite: true,
                linkedinUrl: true,
                bio: true,
                isVerified: true,
              },
            },
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            isDemo: true,
            status: true,
            profile: {
              select: {
                bio: true,
                githubUrl: true,
              },
            },
            skills: {
              where: { status: 'VERIFIED' },
              orderBy: { bestScore: 'desc' },
              take: 3,
              select: {
                language: true,
                bestScore: true,
                claimedLevel: true,
              },
            },
          },
        },
        participants: true,
      },
    });

    if (!conv) {
      throw new MessageError('Conversation not found', 404);
    }

    if (userId !== conv.recruiterId && userId !== conv.developerId) {
      throw new MessageError('Access denied: you are not a participant in this conversation', 403);
    }

    const isRecruiter = userId === conv.recruiterId;
    const otherId = isRecruiter ? conv.developerId : conv.recruiterId;
    const myParticipant = conv.participants.find((p) => p.userId === userId);
    const otherParticipant = conv.participants.find((p) => p.userId === otherId);

    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherId },
          { blockerId: otherId, blockedId: userId },
        ],
      },
    });

    const isBlocked = blocks.length > 0;
    const isBlockedByMe = blocks.some((b) => b.blockerId === userId);

    let latestApproach = null;
    if (conv.origin === 'OPENING') {
      latestApproach = await prisma.approach.findFirst({
        where: {
          developerId: conv.developerId,
          ...(conv.openingId
            ? { openingId: conv.openingId }
            : { opening: { recruiterId: conv.recruiterId } }),
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const composerState = this.computeComposerState(userId, conv, {
      isBlocked,
      latestApproachStatus: latestApproach?.status || null,
      recruiterIsVerified: conv.recruiter.recruiterProfile?.isVerified ?? false,
    });

    const pageSize = Math.min(Math.max(1, limit), 50);
    const messageWhere: any = {
      conversationId,
      deletedAt: null,
    };

    if (cursor) {
      const cursorMsg = await prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true, id: true },
      });
      if (cursorMsg) {
        messageWhere.OR = [
          { createdAt: { lt: cursorMsg.createdAt } },
          { createdAt: cursorMsg.createdAt, id: { lt: cursorMsg.id } },
        ];
      }
    }

    const messagesDesc = await prisma.message.findMany({
      where: messageWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messagesDesc.length > pageSize) {
      const extra = messagesDesc.pop()!;
      nextCursor = extra.id;
    }

    const messages = messagesDesc.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderUsername: m.sender.username,
      body: m.body,
      createdAt: m.createdAt,
    }));

    const recruiterDisplayName = conv.recruiter.recruiterProfile?.companyName
      ? `${conv.recruiter.name} (${conv.recruiter.recruiterProfile.companyName})`
      : conv.recruiter.name;

    const label =
      conv.origin === 'OPENING' && conv.opening
        ? `From opening: ${conv.opening.title}`
        : `Direct message from ${recruiterDisplayName}`;

    return {
      conversation: {
        id: conv.id,
        origin: conv.origin,
        status: conv.status,
        unlockedAt: conv.unlockedAt,
        directReason: conv.directReason,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        label,
        opening: conv.opening
          ? {
              id: conv.opening.id,
              title: conv.opening.title,
              status: conv.opening.status,
            }
          : null,
        approach: latestApproach
          ? {
              id: latestApproach.id,
              status: latestApproach.status,
              openingId: latestApproach.openingId,
            }
          : null,
        myStatus: conv.status,
        muted: myParticipant?.muted ?? false,
        archived: myParticipant?.archived ?? false,
        lastReadAt: myParticipant?.lastReadAt || null,
        otherLastReadAt: otherParticipant?.lastReadAt || null,
        isBlocked,
        isBlockedByMe,
        composerState,
        otherUser: isRecruiter
          ? {
              id: conv.developer.id,
              name: conv.developer.name,
              username: conv.developer.username,
              role: conv.developer.role,
              isDemo: Boolean(conv.developer.isDemo),
              bio: conv.developer.profile?.bio || null,
              avatarUrl: null,
              verifiedSkills: conv.developer.skills.map((s) => ({
                language: s.language,
                score: s.bestScore,
                level: s.claimedLevel,
              })),
            }
          : {
              id: conv.recruiter.id,
              name: conv.recruiter.name,
              username: conv.recruiter.username,
              role: conv.recruiter.role,
              isDemo: Boolean(conv.recruiter.isDemo),
              companyName: conv.recruiter.recruiterProfile?.companyName || '',
              jobTitle: conv.recruiter.recruiterProfile?.jobTitle || '',
              isVerified: Boolean(conv.recruiter.recruiterProfile?.isVerified),
              bio: conv.recruiter.recruiterProfile?.bio || null,
              avatarUrl: null,
              verifiedSkills: [],
            },
      },
      messages,
      nextCursor,
    };
  }

  /**
   * Marks a conversation as read for the given participant.
   */
  static async markRead(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv || (userId !== conv.recruiterId && userId !== conv.developerId)) {
      throw new MessageError('Access denied: not a conversation participant', 403);
    }

    const now = new Date();
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: { lastReadAt: now },
      create: {
        conversationId,
        userId,
        lastReadAt: now,
        muted: false,
        archived: false,
      },
    });

    const otherId = userId === conv.recruiterId ? conv.developerId : conv.recruiterId;
    SocketService.emitToUser(otherId, 'conversation:updated', {
      conversationId,
      readByUserId: userId,
      lastReadAt: now,
    });

    return { conversationId, lastReadAt: now };
  }

  /**
   * Archives a conversation for the user.
   */
  static async archiveConversation(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv || (userId !== conv.recruiterId && userId !== conv.developerId)) {
      throw new MessageError('Access denied: not a conversation participant', 403);
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { archived: true },
    });

    await logAudit(userId, 'CONVERSATION_ARCHIVED', 'Conversation', conversationId, {});

    return { conversationId, archived: true };
  }

  /**
   * Toggles mute on a conversation for the user.
   */
  static async toggleMute(userId: string, conversationId: string, muted?: boolean) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new MessageError('Access denied: not a conversation participant', 403);
    }

    const nextMuted = typeof muted === 'boolean' ? muted : !participant.muted;

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { muted: nextMuted },
    });

    await logAudit(userId, 'CONVERSATION_MUTE_CHANGED', 'Conversation', conversationId, {
      muted: nextMuted,
    });

    return { conversationId, muted: nextMuted };
  }

  /**
   * Blocks another user.
   */
  static async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new MessageError('You cannot block yourself', 400);
    }

    const target = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) {
      throw new MessageError('Target user not found', 404);
    }

    const block = await prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
      update: {},
      create: {
        blockerId,
        blockedId,
      },
    });

    // If a conversation exists between them, mark it BLOCKED
    await prisma.conversation.updateMany({
      where: {
        OR: [
          { recruiterId: blockerId, developerId: blockedId },
          { recruiterId: blockedId, developerId: blockerId },
        ],
      },
      data: { status: 'BLOCKED' },
    });

    await logAudit(blockerId, 'USER_BLOCKED', 'UserBlock', block.id, { blockedId });

    return { blockedId, blocked: true };
  }

  /**
   * Unblocks a previously blocked user.
   */
  static async unblockUser(blockerId: string, blockedId: string) {
    await prisma.userBlock.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });

    // If no remaining block in the opposite direction, restore BLOCKED conversation status
    const reverseBlock = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: blockedId,
          blockedId: blockerId,
        },
      },
    });

    if (!reverseBlock) {
      const convs = await prisma.conversation.findMany({
        where: {
          OR: [
            { recruiterId: blockerId, developerId: blockedId },
            { recruiterId: blockedId, developerId: blockerId },
          ],
          status: 'BLOCKED',
        },
      });

      for (const conv of convs) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            status: conv.unlockedAt ? 'ACTIVE' : 'PENDING_APPROVAL',
          },
        });
      }
    }

    await logAudit(blockerId, 'USER_UNBLOCKED', 'UserBlock', `${blockerId}_${blockedId}`, {
      blockedId,
    });

    return { blockedId, blocked: false };
  }

  /**
   * Reports a message (participants only).
   */
  static async reportMessage(reporterId: string, messageId: string, rawReason: string) {
    const cleanReason = sanitizePlainTextMessage(rawReason, 500);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message || message.deletedAt) {
      throw new MessageError('Message not found', 404);
    }

    if (
      reporterId !== message.conversation.recruiterId &&
      reporterId !== message.conversation.developerId
    ) {
      throw new MessageError(
        'Access denied: only conversation participants can report messages',
        403
      );
    }

    if (message.senderId === reporterId) {
      throw new MessageError('You cannot report your own message', 400);
    }

    const report = await prisma.messageReport.create({
      data: {
        messageId,
        reporterId,
        reason: cleanReason,
        resolved: false,
      },
    });

    await logAudit(reporterId, 'MESSAGE_REPORTED', 'MessageReport', report.id, {
      messageId,
      conversationId: message.conversationId,
      reason: cleanReason,
    });

    return report;
  }

  /**
   * Returns total unread message count for the user across non-archived conversations.
   */
  static async getUnreadCount(userId: string) {
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        archived: false,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    let totalUnread = 0;
    for (const p of participants) {
      const where: any = {
        conversationId: p.conversationId,
        senderId: { not: userId },
        deletedAt: null,
      };
      if (p.lastReadAt) {
        where.createdAt = { gt: p.lastReadAt };
      }
      const count = await prisma.message.count({ where });
      totalUnread += count;
    }

    return { count: totalUnread };
  }

  /**
   * Returns how many new direct conversations the recruiter has remaining today (out of 10).
   */
  static async getRemainingDirectQuota(recruiterId: string) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const usedToday = await prisma.conversation.count({
      where: {
        initiatedByRecruiterId: recruiterId,
        origin: 'DIRECT',
        createdAt: { gte: startOfToday },
      },
    });

    return {
      limit: DAILY_DIRECT_CONVERSATION_LIMIT,
      usedToday,
      remaining: Math.max(0, DAILY_DIRECT_CONVERSATION_LIMIT - usedToday),
    };
  }

  /**
   * Admin: lists reported messages with at most 5 messages of context from that conversation.
   * Never exposes other private conversations or user emails.
   */
  static async getAdminMessageReports(resolvedFilter?: boolean) {
    const reports = await prisma.messageReport.findMany({
      where: typeof resolvedFilter === 'boolean' ? { resolved: resolvedFilter } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, username: true, role: true },
        },
        resolver: {
          select: { id: true, name: true, username: true },
        },
        message: {
          include: {
            sender: {
              select: { id: true, name: true, username: true, role: true, status: true },
            },
          },
        },
      },
    });

    const enriched = [];
    for (const r of reports) {
      // Fetch only 5 messages of context around the reported message
      const contextMessages = await prisma.message.findMany({
        where: {
          conversationId: r.message.conversationId,
          createdAt: { lte: r.message.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          sender: {
            select: { id: true, name: true, username: true, role: true },
          },
        },
      });

      enriched.push({
        id: r.id,
        reason: r.reason,
        resolved: r.resolved,
        resolvedBy: r.resolver,
        createdAt: r.createdAt,
        reporter: r.reporter,
        message: {
          id: r.message.id,
          conversationId: r.message.conversationId,
          body: r.message.body,
          createdAt: r.message.createdAt,
          deletedAt: r.message.deletedAt,
          sender: r.message.sender,
        },
        contextMessages: contextMessages.reverse().map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.sender.name,
          senderUsername: m.sender.username,
          body: m.body,
          createdAt: m.createdAt,
          deletedAt: m.deletedAt,
          isReportedMessage: m.id === r.message.id,
        })),
      });
    }

    return enriched;
  }

  /**
   * Admin: resolves a message report, with optional actions:
   * - deleteMessage: soft-deletes the reported message
   * - warnSender: sends a SYSTEM notification warning the sender
   * - suspendSender: suspends the sender's account
   */
  static async resolveAdminMessageReport(
    adminId: string,
    reportId: string,
    options?: {
      deleteMessage?: boolean;
      warnSender?: boolean;
      suspendSender?: boolean;
    }
  ) {
    const report = await prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: true },
    });

    if (!report) {
      throw new MessageError('Message report not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.messageReport.update({
        where: { id: reportId },
        data: {
          resolved: true,
          resolvedBy: adminId,
        },
      });

      if (options?.deleteMessage && !report.message.deletedAt) {
        await tx.message.update({
          where: { id: report.messageId },
          data: { deletedAt: new Date() },
        });
      }

      if (options?.warnSender) {
        await tx.notification.create({
          data: {
            userId: report.message.senderId,
            type: 'SYSTEM',
            title: 'Community Guidelines Warning',
            body: 'A message you sent was reported and reviewed by moderators. Please keep all communication professional.',
            entityType: 'MessageReport',
            entityId: reportId,
          },
        });
      }

      if (options?.suspendSender) {
        await tx.user.update({
          where: { id: report.message.senderId },
          data: { status: 'SUSPENDED' },
        });
      }
    });

    await logAudit(adminId, 'MESSAGE_REPORT_RESOLVED', 'MessageReport', reportId, {
      messageId: report.messageId,
      senderId: report.message.senderId,
      deleteMessage: Boolean(options?.deleteMessage),
      warnSender: Boolean(options?.warnSender),
      suspendSender: Boolean(options?.suspendSender),
    });

    return { id: reportId, resolved: true };
  }
}
