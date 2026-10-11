import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../config/db.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Try httpOnly cookie first
    let token = req.cookies?.token;

    // 2. Fallback to Authorization Bearer header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true, role: true },
    });

    if (!user) {
      return sendError(res, 'User account no longer exists', 401);
    }

    if (user.status === 'SUSPENDED') {
      return sendError(res, 'Your account has been suspended. Access denied.', 403);
    }

    req.user = decoded;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired session. Please log in again.', 401);
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (token) {
    try {
      req.user = verifyToken(token);
    } catch (_) {
      // ignore
    }
  }
  next();
};
