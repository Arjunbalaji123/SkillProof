import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export class AdminService {
  /**
   * Platform statistics
   */
  static async getPlatformStats() {
    const totalUsers = await prisma.user.count();
    const developerCount = await prisma.user.count({ where: { role: 'DEVELOPER' } });
    const recruiterCount = await prisma.user.count({ where: { role: 'RECRUITER' } });
    const totalQuestions = await prisma.question.count();
    const activeQuestions = await prisma.question.count({ where: { status: 'ACTIVE' } });
    const flaggedQuestions = await prisma.question.count({ where: { status: 'FLAGGED' } });
    const totalAssessments = await prisma.assessment.count();
    const verifiedSkillsCount = await prisma.skill.count({ where: { status: 'VERIFIED' } });
    const claimedSkillsCount = await prisma.skill.count({ where: { status: 'CLAIMED' } });

    // Recent assessments
    const recentAssessments = await prisma.assessment.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return {
      users: {
        total: totalUsers,
        developers: developerCount,
        recruiters: recruiterCount,
      },
      questions: {
        total: totalQuestions,
        active: activeQuestions,
        flagged: flaggedQuestions,
      },
      assessments: {
        total: totalAssessments,
        verifiedSkills: verifiedSkillsCount,
        claimedSkills: claimedSkillsCount,
        recent: recentAssessments,
      },
    };
  }

  /**
   * User management
   */
  static async listUsers(search?: string, role?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role && role !== 'ALL') {
      where.role = { equals: role };
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            skills: true,
            assessments: true,
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user status (e.g. SUSPEND or ACTIVATE)
   */
  static async updateUserStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    await logAudit(adminId, 'USER_STATUS_UPDATED', 'User', userId, { newStatus: status });
    return user;
  }

  /**
   * List flagged questions for review
   */
  static async getFlaggedQuestions() {
    return prisma.questionFlag.findMany({
      include: {
        question: true,
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolve a question flag
   */
  static async resolveFlag(adminId: string, flagId: string, action: 'RESOLVE' | 'RETIRE_QUESTION') {
    const flag = await prisma.questionFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) throw new Error('Flag not found');

    await prisma.questionFlag.update({
      where: { id: flagId },
      data: { resolved: true },
    });

    if (action === 'RETIRE_QUESTION') {
      await prisma.question.update({
        where: { id: flag.questionId },
        data: { status: 'RETIRED' },
      });
      await logAudit(adminId, 'QUESTION_RETIRED', 'Question', flag.questionId, { flagId });
    } else {
      // Revert status to ACTIVE if no other unresolved flags
      const unresolved = await prisma.questionFlag.count({
        where: { questionId: flag.questionId, resolved: false },
      });
      if (unresolved === 0) {
        await prisma.question.update({
          where: { id: flag.questionId },
          data: { status: 'ACTIVE' },
        });
      }
      await logAudit(adminId, 'FLAG_RESOLVED', 'QuestionFlag', flagId);
    }

    return { success: true };
  }

  /**
   * Audit logs
   */
  static async getAuditLogs(limit: number = 100) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}

