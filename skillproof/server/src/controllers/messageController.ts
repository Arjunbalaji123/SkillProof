import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { MessageService, MessageError } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const handleControllerError = (res: Response, err: any, fallbackMessage: string) => {
  const status = err instanceof MessageError ? err.statusCode : err.statusCode || 400;
  return sendError(res, err.message || fallbackMessage, status);
};

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rawTab = String(req.query.tab || 'inbox').toLowerCase();
    const tab =
      rawTab === 'requests' ? 'requests' : rawTab === 'archived' ? 'archived' : 'inbox';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const conversations = await MessageService.listConversations(userId, tab, search);
    return sendSuccess(res, 'Conversations retrieved', conversations);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to fetch conversations');
  }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 30;

    const data = await MessageService.getConversationDetails(
      userId,
      conversationId,
      cursor,
      limit
    );
    return sendSuccess(res, 'Conversation retrieved', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to fetch conversation');
  }
};

export const startConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const recipientIdentifier = req.body.recipientUsername || req.body.recipientId || '';
    const body = req.body.body;

    const result = await MessageService.startConversation(
      userId,
      recipientIdentifier,
      body
    );
    return sendSuccess(
      res,
      result.created ? 'Conversation started' : 'Message sent to conversation',
      result,
      result.created ? 201 : 200
    );
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to start conversation');
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const { body } = req.body;

    const message = await MessageService.sendMessage(userId, conversationId, body);
    return sendSuccess(res, 'Message sent', message, 201);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to send message');
  }
};

export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const data = await MessageService.markRead(userId, conversationId);
    return sendSuccess(res, 'Conversation marked as read', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to mark conversation as read');
  }
};

export const acceptConversationRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const data = await MessageService.acceptRequest(userId, conversationId);
    return sendSuccess(res, 'Message request accepted', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to accept request');
  }
};

export const declineConversationRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const data = await MessageService.declineRequest(userId, conversationId);
    return sendSuccess(res, 'Message request declined', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to decline request');
  }
};

export const archiveConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const data = await MessageService.archiveConversation(userId, conversationId);
    return sendSuccess(res, 'Conversation archive status updated', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to archive conversation');
  }
};

export const toggleMuteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = String(req.params.id || '');
    const muted = typeof req.body?.muted === 'boolean' ? req.body.muted : undefined;
    const data = await MessageService.toggleMute(userId, conversationId, muted);
    return sendSuccess(res, 'Conversation mute setting updated', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to update mute setting');
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const blockedId = String(req.params.userId || '');
    const data = await MessageService.blockUser(blockerId, blockedId);
    return sendSuccess(res, 'User blocked', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to block user');
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const blockedId = String(req.params.userId || '');
    const data = await MessageService.unblockUser(blockerId, blockedId);
    return sendSuccess(res, 'User unblocked', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to unblock user');
  }
};

export const reportMessage = async (req: AuthRequest, res: Response) => {
  try {
    const reporterId = req.user!.userId;
    const messageId = String(req.params.messageId || '');
    const { reason } = req.body;
    const data = await MessageService.reportMessage(reporterId, messageId, reason);
    return sendSuccess(res, 'Message reported to moderation team', data, 201);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to report message');
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = await MessageService.getUnreadCount(userId);
    return sendSuccess(res, 'Unread count retrieved', data);
  } catch (err: any) {
    return handleControllerError(res, err, 'Failed to get unread count');
  }
};

