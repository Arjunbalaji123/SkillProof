import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { RecruiterService } from '../services/recruiterService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const searchDevelopers = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const { language, minScore, level, search } = req.query;

    const developers = await RecruiterService.searchVerifiedDevelopers(recruiterId, {
      language: language as string,
      minScore: minScore ? Number(minScore) : undefined,
      level: level as string,
      search: search as string,
    });

    return sendSuccess(res, 'Verified developers retrieved', developers);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to search developers', 500);
  }
};

export const getBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const bookmarks = await RecruiterService.getBookmarks(recruiterId);
    return sendSuccess(res, 'Bookmarks retrieved', bookmarks);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to get bookmarks', 500);
  }
};

export const setBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const { developerId, note } = req.body;
    const bookmark = await RecruiterService.setBookmark(recruiterId, developerId, note);
    return sendSuccess(res, 'Bookmark saved', bookmark);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to save bookmark', 400);
  }
};

export const removeBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const developerId = req.params.developerId as string;
    await RecruiterService.removeBookmark(recruiterId, developerId);
    return sendSuccess(res, 'Bookmark removed');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to remove bookmark', 400);
  }
};
