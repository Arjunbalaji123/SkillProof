import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.sp_session ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Authentication required',
      });
    }

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
        message: 'Invalid or expired session',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        profile: true,
        recruiterProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User not found',
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'This account is suspended',
        message: 'This account is suspended',
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error: any) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
      message: 'Internal authentication error',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.sp_session ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null);

    if (!token) {
      return next();
    }

    try {
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          profile: true,
          recruiterProfile: true,
        },
      });

      if (user && user.status !== 'SUSPENDED') {
        req.user = user;
        req.userId = user.id;
      }
    } catch {
      // Ignored for optional auth
    }

    next();
  } catch {
    next();
  }
};

