import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { LeaderboardService } from './leaderboardService.js';

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
   * Catalog management: List tracks, skills, and topics
   */
  static async getCatalog() {
    return prisma.track.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        skills: {
          include: {
            topics: {
              orderBy: { weightPercent: 'desc' },
            },
            _count: {
              select: {
                questions: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Track CRUD
   */
  static async createTrack(adminId: string, data: { name: string; description?: string }) {
    const track = await prisma.track.create({ data });
    await logAudit(adminId, 'TRACK_CREATED', 'Track', track.id, { name: track.name });
    return track;
  }

  static async updateTrack(adminId: string, id: string, data: { name?: string; description?: string }) {
    const track = await prisma.track.update({ where: { id }, data });
    await logAudit(adminId, 'TRACK_UPDATED', 'Track', id, data);
    return track;
  }

  static async deleteTrack(adminId: string, id: string) {
    const track = await prisma.track.delete({ where: { id } });
    await logAudit(adminId, 'TRACK_DELETED', 'Track', id);
    return track;
  }

  /**
   * SkillCatalog CRUD
   */
  static async createSkillCatalog(adminId: string, data: {
    trackId: string;
    name: string;
    slug?: string;
    description?: string;
    durationSec?: number;
    questionCount?: number;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const skill = await prisma.skillCatalog.create({
      data: {
        trackId: data.trackId,
        name: data.name,
        slug,
        description: data.description,
        durationSec: data.durationSec || 1800,
        questionCount: data.questionCount || 20,
      },
    });
    await logAudit(adminId, 'SKILL_CATALOG_CREATED', 'SkillCatalog', skill.id, { name: skill.name });
    return skill;
  }

  static async updateSkillCatalog(adminId: string, id: string, data: {
    trackId?: string;
    name?: string;
    slug?: string;
    description?: string;
    durationSec?: number;
    questionCount?: number;
  }) {
    const skill = await prisma.skillCatalog.update({ where: { id }, data });
    await logAudit(adminId, 'SKILL_CATALOG_UPDATED', 'SkillCatalog', id, data);
    return skill;
  }

  static async deleteSkillCatalog(adminId: string, id: string) {
    const skill = await prisma.skillCatalog.delete({ where: { id } });
    await logAudit(adminId, 'SKILL_CATALOG_DELETED', 'SkillCatalog', id);
    return skill;
  }

  /**
   * Topic CRUD
   */
  static async createTopic(adminId: string, data: {
    skillCatalogId: string;
    name: string;
    weightPercent: number;
  }) {
    const topic = await prisma.topic.create({ data });
    await logAudit(adminId, 'TOPIC_CREATED', 'Topic', topic.id, {
      name: topic.name,
      skillCatalogId: topic.skillCatalogId,
    });
    return topic;
  }

  static async updateTopic(adminId: string, id: string, data: {
    name?: string;
    weightPercent?: number;
  }) {
    const topic = await prisma.topic.update({ where: { id }, data });
    await logAudit(adminId, 'TOPIC_UPDATED', 'Topic', id, data);
    return topic;
  }

  static async deleteTopic(adminId: string, id: string) {
    const topic = await prisma.topic.delete({ where: { id } });
    await logAudit(adminId, 'TOPIC_DELETED', 'Topic', id);
    return topic;
  }

  /**
   * Question Pool Health: Questions per topic, flagged count, warning for <15 active
   */
  static async getQuestionPoolHealth() {
    const topics = await prisma.topic.findMany({
      include: {
        skillCatalog: {
          select: { id: true, name: true, slug: true, track: { select: { name: true } } },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { skillCatalog: { name: 'asc' } },
        { weightPercent: 'desc' },
      ],
    });

    const results = [];
    for (const t of topics) {
      const activeCount = await prisma.question.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { topicId: t.id },
            {
              skillCatalogId: t.skillCatalogId,
              topic: { equals: t.name },
            },
            {
              language: { equals: t.skillCatalog.name },
              topic: { equals: t.name },
            },
          ],
        },
      });

      const flaggedCount = await prisma.question.count({
        where: {
          status: 'FLAGGED',
          OR: [
            { topicId: t.id },
            {
              skillCatalogId: t.skillCatalogId,
              topic: { equals: t.name },
            },
            {
              language: { equals: t.skillCatalog.name },
              topic: { equals: t.name },
            },
          ],
        },
      });

      const isLow = activeCount < 15;
      results.push({
        topicId: t.id,
        topicName: t.name,
        weightPercent: t.weightPercent,
        skillId: t.skillCatalog.id,
        skillName: t.skillCatalog.name,
        trackName: t.skillCatalog.track.name,
        activeCount,
        flaggedCount,
        totalCount: t._count.questions,
        isLow,
        warning: isLow ? `Topic has fewer than 15 active questions (${activeCount} available)` : null,
      });
    }

    return results;
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

    await LeaderboardService.recalculateUser(userId);

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
