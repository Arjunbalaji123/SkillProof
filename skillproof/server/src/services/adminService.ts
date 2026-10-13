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
        user: { select: { name: true, username: true } },
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
        { username: { contains: search } },
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
        username: true,
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
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await LeaderboardService.recalculateUser(userId);

    await logAudit(adminId, 'USER_STATUS_UPDATED', 'User', userId, { newStatus: status });
    return user;
  }

  /**
   * Recruiter verification queue (never exposes emails)
   */
  static async listRecruitersForVerification(statusFilter?: string) {
    const recruiters = await prisma.user.findMany({
      where: {
        role: 'RECRUITER',
        ...(statusFilter === 'PENDING'
          ? { recruiterProfile: { isVerified: false } }
          : statusFilter === 'VERIFIED'
          ? { recruiterProfile: { isVerified: true } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        isDemo: true,
        createdAt: true,
        recruiterProfile: true,
        _count: {
          select: {
            openingsCreated: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recruiters.map((r) => ({
      id: r.id,
      recruiterProfileId: r.recruiterProfile?.id || null,
      name: r.name,
      username: r.username,
      status: r.status,
      isDemo: Boolean(r.isDemo),
      createdAt: r.createdAt,
      companyName: r.recruiterProfile?.companyName || '',
      jobTitle: r.recruiterProfile?.jobTitle || '',
      companyWebsite: r.recruiterProfile?.companyWebsite || null,
      linkedinUrl: r.recruiterProfile?.linkedinUrl || null,
      bio: r.recruiterProfile?.bio || null,
      isVerified: Boolean(r.recruiterProfile?.isVerified),
      verifiedBy: r.recruiterProfile?.verifiedBy || null,
      verifiedAt: r.recruiterProfile?.verifiedAt || null,
      openingsCount: r._count.openingsCreated,
    }));
  }

  /**
   * Approve or reject recruiter verification
   */
  static async verifyRecruiter(
    adminId: string,
    targetId: string,
    isVerified: boolean,
    note?: string
  ) {
    // targetId may be user.id or recruiterProfile.id
    let recProfile = await prisma.recruiterProfile.findFirst({
      where: {
        OR: [{ userId: targetId }, { id: targetId }],
      },
    });

    if (!recProfile) {
      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user || user.role !== 'RECRUITER') {
        throw new Error('Recruiter not found');
      }
      recProfile = await prisma.recruiterProfile.create({
        data: {
          userId: user.id,
          companyName: 'Organization',
          jobTitle: 'Recruiter',
          isVerified,
          verifiedBy: isVerified ? adminId : null,
          verifiedAt: isVerified ? new Date() : null,
        },
      });
    } else {
      recProfile = await prisma.recruiterProfile.update({
        where: { id: recProfile.id },
        data: {
          isVerified,
          verifiedBy: isVerified ? adminId : null,
          verifiedAt: isVerified ? new Date() : null,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: recProfile.userId,
        type: 'SYSTEM',
        title: isVerified ? 'Recruiter Account Verified' : 'Recruiter Verification Updated',
        body: isVerified
          ? 'Your recruiter account has been verified! You can now publish openings and message eligible developers.'
          : `Your recruiter verification status is currently unverified.${note ? ` Note: ${note}` : ''}`,
        entityType: 'RecruiterProfile',
        entityId: recProfile.id,
      },
    });

    await logAudit(adminId, 'RECRUITER_VERIFICATION_UPDATED', 'RecruiterProfile', recProfile.id, {
      recruiterUserId: recProfile.userId,
      isVerified,
      note: note || null,
    });

    return recProfile;
  }

  /**
   * List all openings across the platform for admin moderation (never exposes emails)
   */
  static async listAllOpeningsForAdmin(statusFilter?: string) {
    const openings = await prisma.opening.findMany({
      where:
        statusFilter && statusFilter !== 'ALL'
          ? { status: statusFilter }
          : {},
      include: {
        track: true,
        skills: {
          include: {
            skillCatalog: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            username: true,
            isDemo: true,
            recruiterProfile: {
              select: {
                companyName: true,
                jobTitle: true,
                isVerified: true,
              },
            },
          },
        },
        _count: {
          select: {
            approaches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return openings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      status: o.status,
      minLevel: o.minLevel,
      minScore: o.minScore,
      positions: o.positions,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      track: o.track ? { id: o.track.id, name: o.track.name, title: o.track.name } : null,
      skills: o.skills.map((s) => ({
        id: s.skillCatalogId,
        name: s.skillCatalog.name,
      })),
      recruiter: {
        id: o.recruiter.id,
        name: o.recruiter.name,
        username: o.recruiter.username,
        isDemo: Boolean(o.recruiter.isDemo),
        companyName: o.recruiter.recruiterProfile?.companyName || '',
        jobTitle: o.recruiter.recruiterProfile?.jobTitle || '',
        isVerified: Boolean(o.recruiter.recruiterProfile?.isVerified),
      },
      approachCount: o._count.approaches,
    }));
  }

  /**
   * List flagged questions for review
   */
  static async getFlaggedQuestions() {
    return prisma.questionFlag.findMany({
      include: {
        question: true,
        reporter: {
          select: { id: true, name: true, username: true },
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
          select: { id: true, name: true, username: true, role: true },
        },
      },
    });
  }
}
