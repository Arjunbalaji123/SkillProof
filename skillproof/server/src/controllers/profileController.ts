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
