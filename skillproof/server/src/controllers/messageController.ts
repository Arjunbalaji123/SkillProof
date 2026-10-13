import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { MessageService, MessageError } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const startDirectConversation = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.userId;
    const developerUsername =
      req.body.developerUsername || req.body.recipientUsername || req.body.recipientId || '';
    const { body, reason } = req.body;

    const result = await MessageService.startDirectConversation(
      senderId,
      developerUsername,
      body,
      reason
    );

    return sendSuccess(res, 'Direct conversation started', result, 201);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to start conversation', status);
  }
};

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversations = await MessageService.listConversations(userId);
    return sendSuccess(res, 'Conversations retrieved', conversations);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to list conversations', status);
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id as string;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 30;

    const data = await MessageService.getConversationMessages(userId, conversationId, cursor, limit);
    return sendSuccess(res, 'Conversation messages retrieved', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to retrieve messages', status);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.userId;
    const conversationId = req.params.id as string;
    const { body } = req.body;

    const message = await MessageService.sendMessage(senderId, conversationId, body);
    return sendSuccess(res, 'Message sent', message, 201);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to send message', status);
  }
};

export const closeConversation = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const conversationId = req.params.id as string;

    const data = await MessageService.closeConversation(recruiterId, conversationId);
    return sendSuccess(res, 'Conversation closed', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to close conversation', status);
  }
};

export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id as string;

    const data = await MessageService.markRead(userId, conversationId);
    return sendSuccess(res, 'Conversation marked as read', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to mark conversation read', status);
  }
};

export const archiveConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id as string;

    const data = await MessageService.archiveConversation(userId, conversationId);
    return sendSuccess(res, 'Conversation archived', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to archive conversation', status);
  }
};

export const toggleMuteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id as string;
    const muted = typeof req.body?.muted === 'boolean' ? req.body.muted : undefined;

    const data = await MessageService.toggleMute(userId, conversationId, muted);
    return sendSuccess(res, data.muted ? 'Conversation muted' : 'Conversation unmuted', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to update mute state', status);
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const blockedId = req.params.userId as string;

    const data = await MessageService.blockUser(blockerId, blockedId);
    return sendSuccess(res, 'User blocked', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to block user', status);
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const blockedId = req.params.userId as string;

    const data = await MessageService.unblockUser(blockerId, blockedId);
    return sendSuccess(res, 'User unblocked', data);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to unblock user', status);
  }
};

export const reportMessage = async (req: AuthRequest, res: Response) => {
  try {
    const reporterId = req.user!.userId;
    const messageId = req.params.messageId as string;
    const { reason } = req.body;

    const report = await MessageService.reportMessage(reporterId, messageId, reason);
    return sendSuccess(res, 'Message reported to moderators', report, 201);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to report message', status);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = await MessageService.getUnreadCount(userId);
    return sendSuccess(res, 'Unread message count retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch unread count', 500);
  }
};

export const getDirectQuota = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = await MessageService.getRemainingDirectQuota(userId);
    return sendSuccess(res, 'Direct conversation quota retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch direct quota', 500);
  }
};
