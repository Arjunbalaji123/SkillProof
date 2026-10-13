import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { scope, id, period, page, limit } = req.query;
    const currentUserId = req.userId || req.user?.id || req.user?.userId;

    const data = await LeaderboardService.getLeaderboard({
      scope: (scope as any) || 'global',
      id: id as string,
      period: (period as any) || 'all',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      currentUserId,
    });

    res.setHeader('Cache-Control', 'no-store');
    return sendSuccess(res, 'Leaderboard retrieved successfully', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve leaderboard', 500);
  }
};

