import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AuthService } from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { user, token } = await AuthService.register(req.body);

    res.cookie('token', token, COOKIE_OPTIONS);

    return sendSuccess(
      res,
      'Registration successful',
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
        token, // also return token for mobile/bearer compatibility
      },
      201
    );
  } catch (err: any) {
    return sendError(res, err.message || 'Registration failed', 400);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { user, token } = await AuthService.login(req.body);

    res.cookie('token', token, COOKIE_OPTIONS);

    return sendSuccess(res, 'Login successful', {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      token,
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Login failed', 401);
  }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return sendSuccess(res, 'Logged out successfully');
};

export const getSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const session = await AuthService.getSession(req.user.userId);
    if (!session) {
      return sendError(res, 'Session invalid or user suspended', 401);
    }

    return sendSuccess(res, 'Current session retrieved', session);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch session', 500);
  }
};
