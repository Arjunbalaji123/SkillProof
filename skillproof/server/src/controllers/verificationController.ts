import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { verificationRequestSchema, adminVerificationReviewSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getVerifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const where = role === 'ADMIN' ? {} : { user_id: userId };

    const requests = await prisma.verificationRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, profile_image: true } },
          },
        },
        user_skill: {
          include: { skill: true, profile: true },
        },
        documents: true,
        reviewer: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Verification requests retrieved', requests);
  } catch (err) {
    next(err);
  }
};

export const createVerificationRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = verificationRequestSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const userSkill = await prisma.userSkill.findFirst({
      where: { id: validated.user_skill_id, profile_id: profile.id },
      include: { skill: true },
    });

    if (!userSkill) return sendError(res, 'User skill record not found', 404);

    const verificationReq = await prisma.verificationRequest.create({
      data: {
        user_id: userId,
        user_skill_id: userSkill.id,
        method: validated.method,
        status: 'PENDING',
      },
    });

    if (req.file) {
      await prisma.verificationDocument.create({
        data: {
          verification_request_id: verificationReq.id,
          file_path: `/uploads/${req.file.filename}`,
          file_name: req.file.originalname,
          file_type: req.file.mimetype,
          file_size: req.file.size,
        },
      });
    }

    await prisma.userSkill.update({
      where: { id: userSkill.id },
      data: { verification_status: 'PENDING', verification_method: validated.method },
    });

    await logAudit(userId, 'VERIFICATION_REQUESTED', 'VERIFICATION_REQUEST', verificationReq.id, {
      skill: userSkill.skill.name,
      method: validated.method,
    });

    return sendSuccess(res, 'Verification request submitted successfully', verificationReq, 201);
  } catch (err) {
    next(err);
  }
};

export const reviewVerificationRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const requestId = req.params.id as string;
    const validated = adminVerificationReviewSchema.parse(req.body);

    const verificationReq = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        user_skill: { include: { skill: true, profile: true } },
      },
    });

    if (!verificationReq) return sendError(res, 'Verification request not found', 404);

    const isApprove = validated.status === 'VERIFIED';
    const newStatus = isApprove ? 'VERIFIED' : 'REJECTED';

    const updatedReq = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewer_id: adminId,
        rejection_reason: isApprove ? null : (validated.rejection_reason || 'Document or proof did not meet verification criteria'),
      },
      include: {
        user_skill: { include: { skill: true, profile: true } },
      },
    });

    await prisma.userSkill.update({
      where: { id: verificationReq.user_skill_id },
      data: {
        verification_status: newStatus,
        verified_at: isApprove ? new Date() : null,
        verified_by: isApprove ? adminId : null,
        verification_method: verificationReq.method,
      },
    });

    if (verificationReq.user_skill?.profile) {
      await calculateProfileCompletion(verificationReq.user_skill.profile.id);
    }

    const skillName = verificationReq.user_skill.skill.name;
    if (isApprove) {
      await prisma.notification.create({
        data: {
          user_id: verificationReq.user_id,
          title: `Skill Verified: ${skillName}! 🎉`,
          message: `Your verification request for ${skillName} has been approved by admin. Check out your verified badge!`,
          type: 'SUCCESS',
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          user_id: verificationReq.user_id,
          title: `Verification Request Update: ${skillName}`,
          message: `Your verification request for ${skillName} was rejected. Reason: ${validated.rejection_reason || 'Insufficient proof'}.`,
          type: 'DANGER',
        },
      });
    }

    await logAudit(adminId, 'VERIFICATION_REVIEWED', 'VERIFICATION_REQUEST', requestId, {
      status: newStatus,
      developer_id: verificationReq.user_id,
    });

    return sendSuccess(res, `Verification request ${newStatus.toLowerCase()} successfully`, updatedReq);
  } catch (err) {
    next(err);
  }
};

