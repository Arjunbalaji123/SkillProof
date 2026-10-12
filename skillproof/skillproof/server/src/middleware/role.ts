import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { sendError } from '../utils/response.js';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized access', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: [${allowedRoles.join(', ')}], current role: ${req.user.role}`,
        403
      );
    }

    next();
  };
};

export const requireDeveloper = requireRole('DEVELOPER', 'ADMIN');
export const requireRecruiter = requireRole('RECRUITER', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');

