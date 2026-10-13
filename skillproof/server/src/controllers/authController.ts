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

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { user, token } = await AuthService.register(req.body);

    res.cookie('token', token, COOKIE_OPTIONS);

    const message = user.role === 'RECRUITER'
      ? 'Registration successful. Your recruiter account is pending approval.'
      : 'Registration successful';

    return sendSuccess(
      res,
      message,
      {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          profile: user.profile,
          recruiterProfile: (user as any).recruiterProfile || null,
        },
        token, // also return token for mobile/bearer compatibility
      },
      201
    );
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('already') ? 409 : 400);
    return sendError(res, err.message || 'Registration failed', status);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { user, token } = await AuthService.login(req.body);

    res.cookie('token', token, COOKIE_OPTIONS);

    return sendSuccess(res, 'Login successful', {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        profile: user.profile,
        recruiterProfile: (user as any).recruiterProfile || null,
        interests: (user as any).interests || [],
      },
      token,
    });
  } catch (err: any) {
    const status = err.statusCode || 401;
    return sendError(res, err.message || 'Login failed', status);
  }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
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

    const { email: _email, ...sessionWithoutEmail } = session;
    return sendSuccess(res, 'Current session retrieved', sessionWithoutEmail);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch session', 500);
  }
};
