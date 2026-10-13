import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PortfolioService } from '../services/portfolioService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getPublicPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const viewerId = req.user?.userId;
    const portfolio = await PortfolioService.getPublicPortfolioBySlug(slug, viewerId);

    if (!portfolio) {
      return sendError(res, 'Portfolio not found or set to private', 404);
    }

    return sendSuccess(res, 'Portfolio retrieved', portfolio);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve portfolio', 500);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await PortfolioService.updateProfile(userId, req.body);
    return sendSuccess(res, 'Profile updated successfully', profile);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update profile', 400);
  }
};

export const getInterests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = await PortfolioService.getInterests(userId);
    return sendSuccess(res, 'Interests retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve interests', 500);
  }
};

export const updateInterests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { trackIds, skillIds } = req.body;
    const data = await PortfolioService.updateInterests(userId, trackIds || [], skillIds || []);
    return sendSuccess(res, 'Interests updated successfully', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update interests', 400);
  }
};

export const updateMessagingSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { allowRecruiterMessages } = req.body;
    const data = await PortfolioService.updateMessagingSettings(userId, Boolean(allowRecruiterMessages));
    return sendSuccess(res, 'Messaging settings updated', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update messaging settings', 400);
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notificationsPaused } = req.body;
    const data = await PortfolioService.updateNotificationSettings(userId, Boolean(notificationsPaused));
    return sendSuccess(res, 'Notification settings updated', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update notification settings', 400);
  }
};
