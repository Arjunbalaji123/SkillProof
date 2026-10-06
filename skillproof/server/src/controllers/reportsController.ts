import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../utils/audit.js';

export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterId = req.user!.userId;
    const { reported_user_id, content_type, content_id, reason } = req.body;

    if (!reported_user_id || !reason) {
      return sendError(res, 'Reported user ID and reason are required', 400);
    }

    const reportedUser = await prisma.user.findUnique({
      where: { id: String(reported_user_id) },
    });

    if (!reportedUser) {
      return sendError(res, 'Reported user not found', 404);
    }

    const report = await prisma.report.create({
      data: {
        reporter_id: reporterId,
        reported_user_id: String(reported_user_id),
        content_type: content_type ? String(content_type) : 'PROFILE',
        content_id: content_id ? String(content_id) : null,
        reason: String(reason),
        status: 'PENDING',
      },
    });

    await logAudit(reporterId, 'REPORT_SUBMITTED', 'REPORT', report.id, {
      reported_user_id,
      reason,
    });

    return sendSuccess(res, 'Report submitted successfully for admin review', report, 201);
  } catch (err) {
    next(err);
  }
};
