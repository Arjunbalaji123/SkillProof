import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../utils/audit.js';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalDevelopers,
      totalRecruiters,
      verifiedSkillsCount,
      pendingVerificationsCount,
      assessmentsCompletedCount,
      totalProjectsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DEVELOPER' } }),
      prisma.user.count({ where: { role: 'RECRUITER' } }),
      prisma.userSkill.count({ where: { verification_status: 'VERIFIED' } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
      prisma.assessmentAttempt.count({ where: { status: 'PASSED' } }),
      prisma.project.count(),
    ]);

    const usersByRole = [
      { role: 'DEVELOPER', count: totalDevelopers },
      { role: 'RECRUITER', count: totalRecruiters },
      { role: 'ADMIN', count: totalUsers - (totalDevelopers + totalRecruiters) },
    ];

    const [unverified, pending, verified, rejected] = await Promise.all([
      prisma.userSkill.count({ where: { verification_status: 'UNVERIFIED' } }),
      prisma.userSkill.count({ where: { verification_status: 'PENDING' } }),
      prisma.userSkill.count({ where: { verification_status: 'VERIFIED' } }),
      prisma.userSkill.count({ where: { verification_status: 'REJECTED' } }),
    ]);

    const verificationBreakdown = [
      { status: 'VERIFIED', count: verified },
      { status: 'PENDING', count: pending },
      { status: 'UNVERIFIED', count: unverified },
      { status: 'REJECTED', count: rejected },
    ];

    const popularSkills = await prisma.userSkill.groupBy({
      by: ['skill_id'],
      _count: { skill_id: true },
      orderBy: { _count: { skill_id: 'desc' } },
      take: 5,
    });

    const skillIds = popularSkills.map((s) => s.skill_id);
    const skillsList = await prisma.skill.findMany({ where: { id: { in: skillIds } } });

    const topSkillsFormatted = popularSkills.map((item) => {
      const found = skillsList.find((s) => s.id === item.skill_id);
      return {
        name: found ? found.name : 'Unknown',
        category: found ? found.category : 'General',
        count: item._count.skill_id,
      };
    });

    return sendSuccess(res, 'Admin stats retrieved successfully', {
      stats: {
        totalUsers,
        totalDevelopers,
        totalRecruiters,
        verifiedSkillsCount,
        pendingVerificationsCount,
        assessmentsCompletedCount,
        totalProjectsCount,
      },
      charts: {
        usersByRole,
        verificationBreakdown,
        topSkills: topSkillsFormatted,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUsersList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, status, search } = req.query;

    const where: any = {};
    if (role) where.role = String(role);
    if (status) where.status = String(status);
    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { profile: { name: { contains: String(search) } } },
        { profile: { username: { contains: String(search) } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        profile: {
          select: {
            name: true,
            username: true,
            profile_image: true,
            location: true,
            profile_completion: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Users list retrieved', users);
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const targetUserId = req.params.id as string;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return sendError(res, 'Invalid status value. Allowed: ACTIVE, SUSPENDED', 400);
    }

    if (targetUserId === adminId) {
      return sendError(res, 'You cannot suspend your own admin account', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: { id: true, email: true, role: true, status: true },
    });

    await logAudit(adminId, 'USER_STATUS_UPDATED', 'USER', targetUserId, { newStatus: status });

    return sendSuccess(res, `User status updated to ${status}`, updatedUser);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { email: true, role: true, profile: { select: { name: true } } } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return sendSuccess(res, 'Audit logs retrieved', logs);
  } catch (err) {
    next(err);
  }
};

export const getReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { email: true, profile: { select: { name: true } } } },
        reported_user: { select: { email: true, profile: { select: { name: true, username: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Reports list retrieved', reports);
  } catch (err) {
    next(err);
  }
};

