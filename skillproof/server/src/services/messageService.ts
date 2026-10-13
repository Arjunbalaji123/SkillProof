import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { SocketService } from './socketService.js';

export class MessageError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class MessageService {
  /**
   * Strip control characters (except \n), trim whitespace, and enforce 1..2000 characters.
   * Plain text only — escaped on render by React, never rendered via dangerouslySetInnerHTML.
   */
  static sanitizeBody(raw: unknown, maxLen = 2000): string {
    if (typeof raw !== 'string') {
      throw new MessageError('Message body must be a string', 400);
    }
    const normalized = raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Strip ASCII control characters except newline (\x0A) and tab (\x09)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!normalized) {
      throw new MessageError('Message body cannot be empty', 400);
    }
    if (normalized.length > maxLen) {
      throw new MessageError(`Message body cannot exceed ${maxLen} characters`, 400);
    }
    return normalized;
  }

  /**
   * Always store the lexicographically smaller user ID as userAId.
   */
  static getOrderedPair(user1Id: string, user2Id: string): { userAId: string; userBId: string } {
    return user1Id < user2Id
      ? { userAId: user1Id, userBId: user2Id }
      : { userAId: user2Id, userBId: user1Id };
  }

  /**
   * Format a user object for messaging responses — NEVER includes email or passwordHash.
   */
  private static formatPeerUser(user: any) {
    const verifiedSkills = Array.isArray(user.skills)
      ? user.skills.filter((s: any) => s.status === 'VERIFIED')
      : [];
    const topSkill = verifiedSkills.length > 0 ? verifiedSkills[0].language : null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isDemo: Boolean(user.isDemo),
      avatar: null as string | null,
      topSkill,
      verifiedSkills: verifiedSkills.map((s: any) => s.language),
    };
  }

  /**
   * Check if either user has blocked the other.
   */
  static async isBlockedBetween(user1Id: string, user2Id: string) {
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: user1Id, blockedId: user2Id },
          { blockerId: user2Id, blockedId: user1Id },
        ],
      },
    });
    return {
      blockedEitherWay: blocks.length > 0,
      blockedByMe: blocks.some((b) => b.blockerId === user1Id),
      blockedByThem: blocks.some((b) => b.blockerId === user2Id),
    };
  }

  /**
   * Validate that both sender and recipient are eligible for direct messaging.
   */
  private static async validateMessagingEligibility(senderId: string, recipientIdentifier: string) {
    const cleanTarget = (recipientIdentifier || '').trim();
    if (!cleanTarget) {
      throw new MessageError('Recipient is required', 400);
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, username: true, name: true, role: true, status: true, isDemo: true },
    });

    if (!sender || sender.status === 'SUSPENDED') {
      throw new MessageError('Your account is not permitted to send messages', 403);
    }
    if (sender.isDemo) {
      throw new MessageError('Demo accounts cannot send direct messages', 403);
    }
    if (sender.role === 'ADMIN') {
      throw new MessageError('Admin accounts cannot use direct messaging', 403);
    }

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanTarget },
          { username: cleanTarget.toLowerCase() },
        ],
      },
      include: {
        skills: {
          where: { status: 'VERIFIED' },
          orderBy: { bestScore: 'desc' },
        },
      },
    });

    if (!recipient) {
      throw new MessageError('Recipient user not found', 404);
    }
    if (recipient.id === sender.id) {
      throw new MessageError('You cannot message yourself', 400);
    }
    if (recipient.status === 'SUSPENDED') {
      throw new MessageError('Cannot message a suspended account', 403);
    }
    if (recipient.role === 'ADMIN') {
      throw new MessageError('Cannot send direct messages to admin accounts', 403);
    }
    if (recipient.isDemo) {
      throw new MessageError('Cannot message demo accounts', 403);
    }

    const blockStatus = await this.isBlockedBetween(sender.id, recipient.id);
    if (blockStatus.blockedEitherWay) {
      throw new MessageError('Cannot send message: user is blocked', 403);
    }

    return { sender, recipient };
  }

  /**
   * Create a new conversation or reuse the existing conversation between two users.
   * Recipient's status starts as REQUEST until accepted; sender's status is ACTIVE.
   * Enforces max 10 new conversations per user per day.
   */
  static async startConversation(senderId: string, recipientIdentifier: string, firstMessage: string) {
    const cleanBody = this.sanitizeBody(firstMessage, 2000);
    const { sender, recipient } = await this.validateMessagingEligibility(senderId, recipientIdentifier);
    const { userAId, userBId } = this.getOrderedPair(sender.id, recipient.id);

    const existingConv = await prisma.conversation.findUnique({
      where: {
        userAId_userBId: { userAId, userBId },
      },
    });

    if (existingConv) {
      // Reuse existing conversation and send message under sendMessage rules
      const msgResult = await this.sendMessage(sender.id, existingConv.id, cleanBody);
      const summary = await this.getConversationSummaryForUser(sender.id, existingConv.id);
      return {
        conversation: summary,
        message: msgResult,
        created: false,
      };
    }

    // Enforce 10 new conversations per user per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startedTodayCount = await prisma.auditLog.count({
      where: {
        actorId: sender.id,
        action: 'CONVERSATION_STARTED',
        createdAt: { gte: oneDayAgo },
      },
    });

    if (startedTodayCount >= 10) {
      throw new MessageError(
        'Daily limit reached: You can start at most 10 new conversations per day.',
        429
      );
    }

    const now = new Date();
    const { conversation, message } = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          userAId,
          userBId,
          createdAt: now,
          lastMessageAt: now,
          participants: {
            create: [
              {
                userId: sender.id,
                status: 'ACTIVE',
                lastReadAt: now,
                muted: false,
              },
              {
                userId: recipient.id,
                status: 'REQUEST',
                lastReadAt: null,
                muted: false,
              },
            ],
          },
        },
      });

      const msg = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: sender.id,
          body: cleanBody,
          createdAt: now,
        },
      });

      return { conversation: conv, message: msg };
    });

    await logAudit(sender.id, 'CONVERSATION_STARTED', 'Conversation', conversation.id, {
      recipientId: recipient.id,
      recipientUsername: recipient.username,
    });

    const senderSummary = await this.getConversationSummaryForUser(sender.id, conversation.id);
    const recipientSummary = await this.getConversationSummaryForUser(recipient.id, conversation.id);

    const formattedMsg = {
      id: message.id,
      conversationId: conversation.id,
      senderId: sender.id,
      senderUsername: sender.username,
      senderName: sender.name,
      body: message.body,
      createdAt: message.createdAt,
    };

    SocketService.emitToUser(recipient.id, 'message:new', {
      conversationId: conversation.id,
      message: formattedMsg,
    });
    SocketService.emitToUser(recipient.id, 'conversation:updated', recipientSummary);
    SocketService.emitToUser(sender.id, 'conversation:updated', senderSummary);

    return {
      conversation: senderSummary,
      message: formattedMsg,
      created: true,
    };
  }

  /**
   * Send a message in an existing conversation.
   * Allowed ONLY when status is ACTIVE for both sides, OR when the sender is the one who
   * started a still-pending request (limited to at most 3 messages until accepted).
   */
  static async sendMessage(senderId: string, conversationId: string, rawBody: string) {
    const cleanBody = this.sanitizeBody(rawBody, 2000);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        userA: { select: { id: true, username: true, name: true, role: true, status: true, isDemo: true } },
        userB: { select: { id: true, username: true, name: true, role: true, status: true, isDemo: true } },
      },
    });

    if (!conversation) {
      throw new MessageError('Conversation not found', 404);
    }

    const senderParticipant = conversation.participants.find((p) => p.userId === senderId);
    if (!senderParticipant) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const recipientParticipant = conversation.participants.find((p) => p.userId !== senderId);
    if (!recipientParticipant) {
      throw new MessageError('Invalid conversation state', 400);
    }

    const senderUser = conversation.userA.id === senderId ? conversation.userA : conversation.userB;
    const recipientUser = conversation.userA.id === senderId ? conversation.userB : conversation.userA;

    if (senderUser.status === 'SUSPENDED' || senderUser.isDemo || senderUser.role === 'ADMIN') {
      throw new MessageError('Your account cannot send messages', 403);
    }
    if (recipientUser.status === 'SUSPENDED' || recipientUser.isDemo || recipientUser.role === 'ADMIN') {
      throw new MessageError('Cannot send messages to this account', 403);
    }

    const blockStatus = await this.isBlockedBetween(senderId, recipientUser.id);
    if (blockStatus.blockedEitherWay) {
      throw new MessageError('Cannot send message: user is blocked', 403);
    }

    // Check participant statuses
    if (senderParticipant.status === 'REQUEST' || senderParticipant.status === 'DECLINED') {
      throw new MessageError('Please accept the message request before replying', 403);
    }

    const recipientIsPending =
      recipientParticipant.status === 'REQUEST' || recipientParticipant.status === 'DECLINED';

    if (recipientIsPending) {
      // Sender started a still-pending request: limit to 3 messages until accepted
      const sentCount = await prisma.message.count({
        where: {
          conversationId,
          senderId,
          deletedAt: null,
        },
      });

      if (sentCount >= 3) {
        throw new MessageError(
          'You can send at most 3 messages until the recipient accepts your request.',
          403
        );
      }
    }

    const now = new Date();
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body: cleanBody,
          createdAt: now,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      });

      // Update sender lastReadAt (and unarchive sender if they were ARCHIVED)
      await tx.conversationParticipant.update({
        where: { id: senderParticipant.id },
        data: {
          lastReadAt: now,
          ...(senderParticipant.status === 'ARCHIVED' ? { status: 'ACTIVE' } : {}),
        },
      });

      // If recipient had archived an active conversation, unarchive them to ACTIVE so new message appears in Inbox
      if (recipientParticipant.status === 'ARCHIVED') {
        await tx.conversationParticipant.update({
          where: { id: recipientParticipant.id },
          data: { status: 'ACTIVE' },
        });
      }

      return msg;
    });

    await logAudit(senderId, 'MESSAGE_SENT', 'Message', message.id, {
      conversationId,
      recipientId: recipientUser.id,
    });

    const formattedMsg = {
      id: message.id,
      conversationId,
      senderId,
      senderUsername: senderUser.username,
      senderName: senderUser.name,
      body: message.body,
      createdAt: message.createdAt,
    };

    const senderSummary = await this.getConversationSummaryForUser(senderId, conversationId);
    SocketService.emitToUser(senderId, 'conversation:updated', senderSummary);

    // Emit to recipient unless they silently declined the request
    if (recipientParticipant.status !== 'DECLINED') {
      const recipientSummary = await this.getConversationSummaryForUser(recipientUser.id, conversationId);
      if (!recipientParticipant.muted) {
        SocketService.emitToUser(recipientUser.id, 'message:new', {
          conversationId,
          message: formattedMsg,
        });
      }
      SocketService.emitToUser(recipientUser.id, 'conversation:updated', recipientSummary);
    }

    return formattedMsg;
  }

  /**
   * Build a single conversation summary for a specific participant.
   */
  static async getConversationSummaryForUser(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        userA: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            isDemo: true,
            skills: { where: { status: 'VERIFIED' }, orderBy: { bestScore: 'desc' } },
          },
        },
        userB: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            isDemo: true,
            skills: { where: { status: 'VERIFIED' }, orderBy: { bestScore: 'desc' } },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conv) {
      throw new MessageError('Conversation not found', 404);
    }

    const myPart = conv.participants.find((p) => p.userId === userId);
    if (!myPart) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const peerPart = conv.participants.find((p) => p.userId !== userId)!;
    const otherUserRaw = conv.userA.id === userId ? conv.userB : conv.userA;

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: conv.id,
        senderId: { not: userId },
        deletedAt: null,
        ...(myPart.lastReadAt ? { createdAt: { gt: myPart.lastReadAt } } : {}),
      },
    });

    const sentByMeCount = await prisma.message.count({
      where: {
        conversationId: conv.id,
        senderId: userId,
        deletedAt: null,
      },
    });

    // Never reveal DECLINED to the sender — they just see "pending" (REQUEST)
    const peerVisibleStatus =
      peerPart.status === 'REQUEST' || peerPart.status === 'DECLINED' ? 'REQUEST' : 'ACTIVE';
    const isPending = myPart.status === 'ACTIVE' && peerVisibleStatus === 'REQUEST';

    const lastMsg = conv.messages[0] || null;
    const blockStatus = await this.isBlockedBetween(userId, otherUserRaw.id);

    return {
      id: conv.id,
      otherUser: this.formatPeerUser(otherUserRaw),
      myStatus: myPart.status,
      peerStatus: peerVisibleStatus,
      isPending,
      pendingMessagesRemaining: isPending ? Math.max(0, 3 - sentByMeCount) : null,
      muted: myPart.muted,
      lastReadAt: myPart.lastReadAt,
      peerLastReadAt: peerVisibleStatus === 'ACTIVE' ? peerPart.lastReadAt : null,
      unreadCount,
      isBlockedByMe: blockStatus.blockedByMe,
      isBlockedEitherWay: blockStatus.blockedEitherWay,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            senderId: lastMsg.senderId,
            body: lastMsg.body,
            createdAt: lastMsg.createdAt,
          }
        : null,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
    };
  }

  /**
   * List conversations for a user filtered by tab: inbox | requests | archived.
   */
  static async listConversations(
    userId: string,
    tab: 'inbox' | 'requests' | 'archived' = 'inbox',
    search?: string
  ) {
    const targetStatus =
      tab === 'requests' ? 'REQUEST' : tab === 'archived' ? 'ARCHIVED' : 'ACTIVE';

    const participantRows = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        status: targetStatus,
      },
      include: {
        conversation: {
          include: {
            participants: true,
            userA: {
              select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isDemo: true,
                skills: { where: { status: 'VERIFIED' }, orderBy: { bestScore: 'desc' } },
              },
            },
            userB: {
              select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isDemo: true,
                skills: { where: { status: 'VERIFIED' }, orderBy: { bestScore: 'desc' } },
              },
            },
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

    const cleanSearch = (search || '').trim().toLowerCase();
    const results = [];

    for (const row of participantRows) {
      const conv = row.conversation;
      const otherUserRaw = conv.userA.id === userId ? conv.userB : conv.userA;

      if (cleanSearch) {
        const matchesUsername = otherUserRaw.username.toLowerCase().includes(cleanSearch);
        const matchesName = otherUserRaw.name.toLowerCase().includes(cleanSearch);
        if (!matchesUsername && !matchesName) continue;
      }

      const blockStatus = await this.isBlockedBetween(userId, otherUserRaw.id);
      // Hide blocked users from requests tab
      if (tab === 'requests' && blockStatus.blockedEitherWay) {
        continue;
      }

      const peerPart = conv.participants.find((p) => p.userId !== userId)!;
      const peerVisibleStatus =
        peerPart.status === 'REQUEST' || peerPart.status === 'DECLINED' ? 'REQUEST' : 'ACTIVE';
      const isPending = row.status === 'ACTIVE' && peerVisibleStatus === 'REQUEST';

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          deletedAt: null,
          ...(row.lastReadAt ? { createdAt: { gt: row.lastReadAt } } : {}),
        },
      });

      const lastMsg = conv.messages[0] || null;

      results.push({
        id: conv.id,
        otherUser: this.formatPeerUser(otherUserRaw),
        myStatus: row.status,
        peerStatus: peerVisibleStatus,
        isPending,
        muted: row.muted,
        lastReadAt: row.lastReadAt,
        peerLastReadAt: peerVisibleStatus === 'ACTIVE' ? peerPart.lastReadAt : null,
        unreadCount,
        isBlockedByMe: blockStatus.blockedByMe,
        isBlockedEitherWay: blockStatus.blockedEitherWay,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              senderId: lastMsg.senderId,
              body: lastMsg.body,
              createdAt: lastMsg.createdAt,
            }
          : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      });
    }

    return results;
  }

  /**
   * Get paginated messages (30 per page) for a conversation.
   * Verifies that userId is a participant on every call.
   */
  static async getConversationDetails(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 30
  ) {
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 30));
    const summary = await this.getConversationSummaryForUser(userId, conversationId);

    const messagesDesc = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const hasMore = messagesDesc.length > pageSize;
    const sliced = hasMore ? messagesDesc.slice(0, pageSize) : messagesDesc;
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

    const peerLastReadTime = summary.peerLastReadAt
      ? new Date(summary.peerLastReadAt).getTime()
      : null;

    // Return in chronological order (oldest -> newest)
    const messages = sliced.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderUsername: m.sender.username,
      senderName: m.sender.name,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
      readByRecipient:
        peerLastReadTime !== null && new Date(m.createdAt).getTime() <= peerLastReadTime,
    }));

    const pendingMessagesSent =
      summary.pendingMessagesRemaining !== null
        ? Math.max(0, 3 - summary.pendingMessagesRemaining)
        : 0;

    const canSend =
      !summary.isBlockedEitherWay &&
      summary.myStatus !== 'REQUEST' &&
      summary.myStatus !== 'DECLINED' &&
      (!summary.isPending || pendingMessagesSent < 3);

    return {
      id: summary.id,
      createdAt: summary.createdAt,
      lastMessageAt: summary.lastMessageAt,
      myParticipant: {
        userId,
        status: summary.myStatus,
        muted: summary.muted,
        lastReadAt: summary.lastReadAt,
      },
      otherParticipant: {
        userId: summary.otherUser.id,
        status: summary.peerStatus,
        lastReadAt: summary.peerLastReadAt,
        user: summary.otherUser,
      },
      isPending: summary.isPending,
      pendingMessagesSent,
      pendingMessageLimit: 3,
      isBlockedByMe: summary.isBlockedByMe,
      isBlockedByPeer: summary.isBlockedEitherWay && !summary.isBlockedByMe,
      canSend,
      conversation: summary,
      messages,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Mark a conversation as read for the participant.
   */
  static async markRead(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const now = new Date();
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: now },
    });

    await logAudit(userId, 'CONVERSATION_MARKED_READ', 'Conversation', conversationId);

    // Notify the other participant so their "Read" receipt updates if both are ACTIVE
    const allParts = await prisma.conversationParticipant.findMany({
      where: { conversationId },
    });
    const peerPart = allParts.find((p) => p.userId !== userId);
    if (peerPart && participant.status === 'ACTIVE') {
      const peerSummary = await this.getConversationSummaryForUser(peerPart.userId, conversationId);
      SocketService.emitToUser(peerPart.userId, 'conversation:updated', peerSummary);
    }

    return { conversationId, lastReadAt: now };
  }

  /**
   * Accept a message request.
   */
  static async acceptRequest(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const now = new Date();
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'ACTIVE',
        lastReadAt: now,
      },
    });

    await logAudit(userId, 'MESSAGE_REQUEST_ACCEPTED', 'Conversation', conversationId);

    const mySummary = await this.getConversationSummaryForUser(userId, conversationId);
    const peerPart = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });
    if (peerPart) {
      const peerSummary = await this.getConversationSummaryForUser(peerPart.userId, conversationId);
      SocketService.emitToUser(peerPart.userId, 'conversation:updated', peerSummary);
    }
    SocketService.emitToUser(userId, 'conversation:updated', mySummary);

    return mySummary;
  }

  /**
   * Decline a message request silently (sender is NOT told; they still see "pending").
   */
  static async declineRequest(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { status: 'DECLINED' },
    });

    await logAudit(userId, 'MESSAGE_REQUEST_DECLINED', 'Conversation', conversationId);

    return { conversationId, status: 'DECLINED' };
  }

  /**
   * Archive (or unarchive) a conversation for the user.
   */
  static async archiveConversation(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const nextStatus = participant.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { status: nextStatus },
    });

    await logAudit(userId, 'CONVERSATION_ARCHIVE_TOGGLED', 'Conversation', conversationId, {
      status: nextStatus,
    });

    return this.getConversationSummaryForUser(userId, conversationId);
  }

  /**
   * Toggle mute status on a conversation.
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
      throw new MessageError('Access denied: You are not a participant in this conversation', 403);
    }

    const nextMuted = muted !== undefined ? Boolean(muted) : !participant.muted;
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { muted: nextMuted },
    });

    await logAudit(userId, 'CONVERSATION_MUTE_TOGGLED', 'Conversation', conversationId, {
      muted: nextMuted,
    });

    return this.getConversationSummaryForUser(userId, conversationId);
  }

  /**
   * Block a user.
   */
  static async blockUser(blockerId: string, blockedId: string) {
    if (!blockedId || blockerId === blockedId) {
      throw new MessageError('Invalid user to block', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, username: true },
    });
    if (!target) {
      throw new MessageError('User not found', 404);
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

    // If there is a pending request from blockedId, mark it DECLINED for blockerId
    const { userAId, userBId } = this.getOrderedPair(blockerId, blockedId);
    const existingConv = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existingConv) {
      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: existingConv.id,
          userId: blockerId,
          status: 'REQUEST',
        },
        data: { status: 'DECLINED' },
      });
    }

    await logAudit(blockerId, 'USER_BLOCKED', 'UserBlock', block.id, {
      blockedId,
      blockedUsername: target.username,
    });

    return { blockedId, blocked: true };
  }

  /**
   * Unblock a user.
   */
  static async unblockUser(blockerId: string, blockedId: string) {
    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existing) {
      await prisma.userBlock.delete({ where: { id: existing.id } });
      await logAudit(blockerId, 'USER_UNBLOCKED', 'UserBlock', existing.id, { blockedId });
    }

    return { blockedId, blocked: false };
  }

  /**
   * Report a message in a conversation where reporterId is a participant.
   */
  static async reportMessage(reporterId: string, messageId: string, rawReason: string) {
    const cleanReason = this.sanitizeBody(rawReason, 500);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: true },
        },
      },
    });

    if (!message || message.deletedAt) {
      throw new MessageError('Message not found', 404);
    }

    const isParticipant = message.conversation.participants.some((p) => p.userId === reporterId);
    if (!isParticipant) {
      throw new MessageError('Access denied: You can only report messages in your own conversations', 403);
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
      senderId: message.senderId,
      reason: cleanReason,
    });

    return report;
  }

  /**
   * Get total unread messages count and pending requests count for navbar badge.
   */
  static async getUnreadCount(userId: string) {
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'REQUEST'] },
        muted: false,
      },
    });

    let unreadMessages = 0;
    let pendingRequests = 0;

    for (const part of participants) {
      if (part.status === 'REQUEST') {
        pendingRequests += 1;
      }

      const count = await prisma.message.count({
        where: {
          conversationId: part.conversationId,
          senderId: { not: userId },
          deletedAt: null,
          ...(part.lastReadAt ? { createdAt: { gt: part.lastReadAt } } : {}),
        },
      });
      unreadMessages += count;
    }

    return {
      unreadCount: unreadMessages,
      inboxUnread: Math.max(0, unreadMessages - pendingRequests),
      requestsCount: pendingRequests,
      total: unreadMessages,
      totalBadgeCount: unreadMessages,
    };
  }

  /**
   * ADMIN: List reported messages with ONLY 5 messages of context (never other private chats).
   */
  static async getAdminMessageReports(resolvedFilter?: boolean) {
    const reports = await prisma.messageReport.findMany({
      where: resolvedFilter !== undefined ? { resolved: resolvedFilter } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, username: true, name: true, role: true },
        },
        resolver: {
          select: { id: true, username: true, name: true },
        },
        message: {
          include: {
            sender: {
              select: { id: true, username: true, name: true, role: true, status: true },
            },
          },
        },
      },
    });

    const results = [];
    for (const r of reports) {
      // Fetch ONLY 5 messages of context around/up to the reported message in that conversation
      const contextMessages = await prisma.message.findMany({
        where: {
          conversationId: r.message.conversationId,
          createdAt: { lte: r.message.createdAt },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
        include: {
          sender: {
            select: { id: true, username: true, name: true, role: true },
          },
        },
      });

      results.push({
        id: r.id,
        reason: r.reason,
        resolved: r.resolved,
        createdAt: r.createdAt,
        reporter: r.reporter,
        reportedUser: r.message.sender,
        resolver: r.resolver,
        reportedMessage: {
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
          senderUsername: m.sender.username,
          senderName: m.sender.name,
          body: m.body,
          createdAt: m.createdAt,
          isReportedMessage: m.id === r.message.id,
        })),
      });
    }

    return results;
  }

  /**
   * ADMIN: Resolve a message report with action: 'resolve' | 'warn' | 'suspend'
   */
  static async resolveAdminMessageReport(
    adminId: string,
    reportId: string,
    action: 'resolve' | 'warn' | 'suspend',
    note?: string
  ) {
    const report = await prisma.messageReport.findUnique({
      where: { id: reportId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, username: true, name: true, status: true } },
          },
        },
      },
    });

    if (!report) {
      throw new MessageError('Message report not found', 404);
    }

    const senderId = report.message.senderId;

    const updatedReport = await prisma.$transaction(async (tx) => {
      const updated = await tx.messageReport.update({
        where: { id: reportId },
        data: {
          resolved: true,
          resolvedBy: adminId,
        },
      });

      if (action === 'suspend') {
        await tx.user.update({
          where: { id: senderId },
          data: { status: 'SUSPENDED' },
        });
      }

      return updated;
    });

    if (action === 'warn') {
      await logAudit(adminId, 'MESSAGE_REPORT_WARNED_SENDER', 'MessageReport', reportId, {
        senderId,
        senderUsername: report.message.sender.username,
        messageId: report.messageId,
        note: note || 'Official moderation warning issued',
      });
    } else if (action === 'suspend') {
      await logAudit(adminId, 'MESSAGE_REPORT_SUSPENDED_SENDER', 'MessageReport', reportId, {
        senderId,
        senderUsername: report.message.sender.username,
        messageId: report.messageId,
        note: note || 'Account suspended due to reported message violation',
      });
    } else {
      await logAudit(adminId, 'MESSAGE_REPORT_RESOLVED', 'MessageReport', reportId, {
        messageId: report.messageId,
        note: note || 'Resolved by admin',
      });
    }

    return {
      ...updatedReport,
      action,
    };
  }

  static async moderateMessageReport(
    adminId: string,
    reportId: string,
    action: 'resolve' | 'warn' | 'suspend',
    note?: string
  ) {
    return this.resolveAdminMessageReport(adminId, reportId, action, note);
  }
}
