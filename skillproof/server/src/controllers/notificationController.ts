import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const data = await NotificationService.listNotifications(userId, cursor, limit);
    return sendSuccess(res, 'Notifications retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve notifications', 500);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const data = await NotificationService.getUnreadCount(userId);
    return sendSuccess(res, 'Unread notification count retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve unread notification count', 500);
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const notificationId = req.params.id as string;
    const updated = await NotificationService.markRead(userId, notificationId);
    return sendSuccess(res, 'Notification marked as read', updated);
  } catch (err: any) {
    const status = err.message?.includes('Access denied')
      ? 403
      : err.message?.includes('not found')
      ? 404
      : 400;
    return sendError(res, err.message || 'Failed to mark notification read', status);
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const data = await NotificationService.markAllRead(userId);
    return sendSuccess(res, 'All notifications marked as read', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to mark all notifications read', 500);
  }
};

