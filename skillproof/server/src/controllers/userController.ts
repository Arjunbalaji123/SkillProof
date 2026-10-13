import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const checkUsername = async (req: Request, res: Response) => {
  try {
    const username = (req.query.u || req.query.username || '') as string;
    const result = await UserService.checkUsername(username);
    return sendSuccess(res, result.message, result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to check username', 400);
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q || '') as string;
    if (q.trim().length < 2) {
      return sendSuccess(res, 'Query too short', []);
    }
    const results = await UserService.searchUsers(q);
    return sendSuccess(res, 'Users found', results);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to search users', 500);
  }
};

