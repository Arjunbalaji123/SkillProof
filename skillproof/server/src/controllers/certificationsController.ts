import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { certificationSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getCertifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const certifications = await prisma.certification.findMany({
      where: { profile_id: profile.id },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Certifications retrieved successfully', certifications);
  } catch (err) {
    next(err);
  }
};

export const createCertification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = certificationSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    let document_url = null;
    if (req.file) {
      document_url = `/uploads/${req.file.filename}`;
    }

    const cert = await prisma.certification.create({
      data: {
        profile_id: profile.id,
        title: validated.title,
        issuer: validated.issuer,
        issue_date: validated.issue_date,
        expiry_date: validated.expiry_date || null,
        credential_id: validated.credential_id || null,
        credential_url: validated.credential_url || null,
        document_url,
      },
    });

    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'CERTIFICATION_ADDED', 'CERTIFICATION', cert.id);

    return sendSuccess(res, 'Certification created successfully', cert, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCertification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validated = certificationSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    let document_url = undefined;
    if (req.file) {
      document_url = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.certification.update({
      where: { id },
      data: {
        title: validated.title,
        issuer: validated.issuer,
        issue_date: validated.issue_date,
        expiry_date: validated.expiry_date || null,
        credential_id: validated.credential_id || null,
        credential_url: validated.credential_url || null,
        ...(document_url ? { document_url } : {}),
      },
    });

    return sendSuccess(res, 'Certification updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteCertification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    await prisma.certification.delete({ where: { id } });
    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'CERTIFICATION_DELETED', 'CERTIFICATION', id);

    return sendSuccess(res, 'Certification deleted successfully');
  } catch (err) {
    next(err);
  }
};

