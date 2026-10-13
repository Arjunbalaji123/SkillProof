import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { LeaderboardService } from './leaderboardService.js';
import { SocketService } from './socketService.js';
import { NotificationService } from './notificationService.js';
import { OpeningService } from './openingService.js';

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
    const isRejectedWhere = {
      recruiterProfile: {
        isVerified: false,
        verifiedBy: { startsWith: 'REJECTED' },
      },
    };
    const isPendingWhere = {
      recruiterProfile: {
        isVerified: false,
        NOT: { verifiedBy: { startsWith: 'REJECTED' } },
      },
    };
    const isVerifiedWhere = {
      recruiterProfile: {
        isVerified: true,
      },
    };

    let statusCondition = {};
    if (statusFilter === 'PENDING') {
      statusCondition = isPendingWhere;
    } else if (statusFilter === 'VERIFIED') {
      statusCondition = isVerifiedWhere;
    } else if (statusFilter === 'REJECTED') {
      statusCondition = isRejectedWhere;
    }

    const recruiters = await prisma.user.findMany({
      where: {
        role: 'RECRUITER',
        isDemo: false,
        ...statusCondition,
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

    return recruiters.map((r) => {
      const rp = r.recruiterProfile;
      const isRejected = !rp?.isVerified && Boolean(rp?.verifiedBy?.startsWith('REJECTED'));
      const verificationStatus = rp?.isVerified
        ? 'VERIFIED'
        : isRejected
        ? 'REJECTED'
        : 'PENDING';
      const isIncomplete = !rp || !rp.companyName?.trim() || !rp.jobTitle?.trim();

      return {
        id: r.id, // User.id (userId)
        userId: r.id,
        recruiterProfileId: rp?.id || null,
        name: r.name,
        username: r.username,
        status: r.status,
        isDemo: Boolean(r.isDemo),
        createdAt: r.createdAt,
        companyName: rp?.companyName || '',
        jobTitle: rp?.jobTitle || '',
        companyWebsite: rp?.companyWebsite || null,
        linkedinUrl: rp?.linkedinUrl || null,
        bio: rp?.bio || null,
        isVerified: Boolean(rp?.isVerified),
        verificationStatus,
        isRejected,
        isIncomplete,
        verifiedBy: rp?.verifiedBy || null,
        verifiedAt: rp?.verifiedAt || null,
        openingsCount: r._count.openingsCreated,
        recruiterProfile: rp
          ? {
              id: rp.id,
              userId: rp.userId,
              companyName: rp.companyName,
              jobTitle: rp.jobTitle,
              companyWebsite: rp.companyWebsite,
              linkedinUrl: rp.linkedinUrl,
              bio: rp.bio,
              isVerified: rp.isVerified,
              verifiedBy: rp.verifiedBy,
              verifiedAt: rp.verifiedAt,
            }
          : null,
      };
    });
  }

  /**
   * Set recruiter verification: APPROVE, REJECT, or UNVERIFY
   * ADMIN role only; atomic transaction; notification + audit log.
   */
  static async setRecruiterVerification(
    adminId: string,
    userId: string,
    decision: 'APPROVE' | 'REJECT' | 'UNVERIFY',
    reason?: string
  ) {
    // 1. ADMIN role check
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      const err: any = new Error('Access denied: Administrator privileges required');
      err.statusCode = 403;
      throw err;
    }

    // 2. Find recruiter by User.id (or fallback by recruiterProfile.id)
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { recruiterProfile: true },
    });

    if (!user) {
      const profile = await prisma.recruiterProfile.findUnique({
        where: { id: userId },
        include: { user: true },
      });
      if (profile) {
        user = { ...profile.user, recruiterProfile: profile } as any;
      }
    }

    if (!user || user.role !== 'RECRUITER') {
      const err: any = new Error('Recruiter not found');
      err.statusCode = 404;
      throw err;
    }

    let profile = user.recruiterProfile;

    // 3. Completeness check
    if (!profile) {
      const err: any = new Error('Recruiter profile is incomplete. Profile record does not exist.');
      err.statusCode = 409;
      throw err;
    }

    if (!profile.companyName?.trim() || !profile.jobTitle?.trim()) {
      const err: any = new Error('Recruiter profile is incomplete. Company name and job title are required.');
      err.statusCode = 409;
      throw err;
    }

    const isVerified = decision === 'APPROVE';
    const verifiedBy =
      decision === 'APPROVE'
        ? adminId
        : decision === 'REJECT'
        ? `REJECTED:${adminId}`
        : null;
    const verifiedAt =
      decision === 'APPROVE' || decision === 'REJECT' ? new Date() : null;

    const notifTitle =
      decision === 'APPROVE'
        ? 'Recruiter Account Approved'
        : decision === 'REJECT'
        ? 'Recruiter Verification Rejected'
        : 'Recruiter Verification Revoked';

    const notifBody =
      decision === 'APPROVE'
        ? 'Your recruiter account was approved. You can now publish hiring openings and message eligible developers.'
        : decision === 'REJECT'
        ? reason
          ? `Your recruiter account verification was rejected. Reason: ${reason}`
          : 'Your recruiter account verification was rejected.'
        : 'Your recruiter verification has been revoked by an administrator.';

    const auditAction =
      decision === 'APPROVE'
        ? 'RECRUITER_APPROVED'
        : decision === 'REJECT'
        ? 'RECRUITER_REJECTED'
        : 'RECRUITER_UNVERIFIED';

    // 4. Atomic transaction: update profile & create notification
    const result = await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.recruiterProfile.update({
        where: { id: profile!.id },
        data: {
          isVerified,
          verifiedBy,
          verifiedAt,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: user!.id,
          type: 'SYSTEM',
          title: notifTitle,
          body: notifBody,
          entityType: 'RecruiterProfile',
          entityId: updatedProfile.id,
        },
      });

      return { updatedProfile, notification };
    });

    // 5. Audit log
    await logAudit(adminId, auditAction, 'RecruiterProfile', profile.id, {
      recruiterUserId: user.id,
      decision,
      reason: reason || null,
      isVerified,
    });

    // 6. Real-time notification
    SocketService.emitToUser(user.id, 'notification:new', {
      notification: result.notification,
    });

    return {
      id: user.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      companyName: result.updatedProfile.companyName,
      jobTitle: result.updatedProfile.jobTitle,
      companyWebsite: result.updatedProfile.companyWebsite,
      linkedinUrl: result.updatedProfile.linkedinUrl,
      bio: result.updatedProfile.bio,
      isVerified: result.updatedProfile.isVerified,
      verifiedBy: result.updatedProfile.verifiedBy,
      verifiedAt: result.updatedProfile.verifiedAt,
      recruiterProfile: result.updatedProfile,
    };
  }

  /**
   * Alias for backwards compatibility
   */
  static async verifyRecruiter(
    adminId: string,
    targetId: string,
    isVerified: boolean,
    note?: string
  ) {
    const decision = isVerified ? 'APPROVE' : 'UNVERIFY';
    return this.setRecruiterVerification(adminId, targetId, decision, note);
  }

  /**
   * List all openings across the platform for admin moderation (never exposes emails)
   * Includes potentialMatchCount preview computed with the real matching query.
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

    const result = await Promise.all(
      openings.map(async (o) => {
        let potentialMatchCount = 0;
        try {
          const devs = await OpeningService.findMatchingDevelopers(o.id);
          potentialMatchCount = devs.length;
        } catch {
          potentialMatchCount = 0;
        }

        return {
          id: o.id,
          title: o.title,
          description: o.description,
          status: o.status,
          minLevel: o.minLevel,
          minScore: o.minScore,
          positions: o.positions,
          expiresAt: o.expiresAt,
          createdAt: o.createdAt,
          reviewedBy: o.reviewedBy || null,
          reviewedAt: o.reviewedAt || null,
          rejectionReason: o.rejectionReason || null,
          notifiedAt: o.notifiedAt || null,
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
          potentialMatchCount,
        };
      })
    );

    return result;
  }

  /**
   * Reviews an opening: APPROVE or REJECT. ADMIN role only, in one transaction:
   * APPROVE -> status ACTIVE, reviewedBy, reviewedAt, and if notifiedAt is null,
   *            calls NotificationService.notifyMatches inside the same flow, then sets notifiedAt = now.
   * REJECT  -> status REJECTED with a required reason; notifies the recruiter with the reason.
   * Re-approving an opening that already has notifiedAt does not notify again.
   * Writes audit log entries for both decisions.
   */
  static async reviewOpening(
    adminId: string,
    openingId: string,
    decision: 'APPROVE' | 'REJECT',
    reason?: string
  ) {
    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, status: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      const err: any = new Error('Access denied: Administrator privileges required');
      err.statusCode = 403;
      throw err;
    }

    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            username: true,
            recruiterProfile: true,
          },
        },
        skills: {
          include: { skillCatalog: true },
        },
        track: true,
      },
    });

    if (!opening) {
      const err: any = new Error('Opening not found');
      err.statusCode = 404;
      throw err;
    }

    if (decision === 'APPROVE') {
      // Check 5-active limit for recruiter
      const activeCount = await prisma.opening.count({
        where: {
          recruiterId: opening.recruiterId,
          status: 'ACTIVE',
          id: { not: openingId },
        },
      });

      if (activeCount >= 5) {
        const err: any = new Error(
          'Recruiter already has 5 active openings. They must close or pause an existing opening before this one can be approved.'
        );
        err.statusCode = 400;
        throw err;
      }

      const isFirstApproval = opening.notifiedAt === null;
      const now = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        return tx.opening.update({
          where: { id: openingId },
          data: {
            status: 'ACTIVE',
            reviewedBy: adminId,
            reviewedAt: now,
            rejectionReason: null,
            ...(isFirstApproval ? { notifiedAt: now } : {}),
          },
          include: {
            track: true,
            skills: { include: { skillCatalog: true } },
            recruiter: {
              select: {
                id: true,
                name: true,
                username: true,
                recruiterProfile: true,
              },
            },
          },
        });
      });

      let notifiedCount = 0;
      if (isFirstApproval) {
        // Dispatch matching notifications inside the same flow
        const notifyResult = await NotificationService.notifyMatches(openingId);
        notifiedCount = notifyResult.notifiedCount;

        // Notify recruiter of approval and developer matches
        const recNotif = await prisma.notification.create({
          data: {
            userId: opening.recruiterId,
            type: 'OPENING_MATCH',
            title: `Opening Approved: ${opening.title}`,
            body: `Your opening was approved and ${notifiedCount} developers were notified.`,
            entityType: 'opening',
            entityId: opening.id,
          },
        });
        SocketService.emitToUser(opening.recruiterId, 'notification:new', { notification: recNotif });
      } else {
        // Re-approving an opening that already has notifiedAt does not notify developers again
        const recNotif = await prisma.notification.create({
          data: {
            userId: opening.recruiterId,
            type: 'OPENING_MATCH',
            title: `Opening Approved: ${opening.title}`,
            body: `Your opening was approved.`,
            entityType: 'opening',
            entityId: opening.id,
          },
        });
        SocketService.emitToUser(opening.recruiterId, 'notification:new', { notification: recNotif });
      }

      await logAudit(adminId, 'OPENING_APPROVED', 'Opening', openingId, {
        decision,
        notifiedCount,
        isFirstApproval,
      });

      return updated;
    } else if (decision === 'REJECT') {
      const cleanReason = String(reason || '').trim();
      if (!cleanReason) {
        const err: any = new Error('A rejection reason is required when rejecting an opening.');
        err.statusCode = 400;
        throw err;
      }

      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const op = await tx.opening.update({
          where: { id: openingId },
          data: {
            status: 'REJECTED',
            reviewedBy: adminId,
            reviewedAt: now,
            rejectionReason: cleanReason,
          },
          include: {
            track: true,
            skills: { include: { skillCatalog: true } },
            recruiter: {
              select: {
                id: true,
                name: true,
                username: true,
                recruiterProfile: true,
              },
            },
          },
        });

        // Notify recruiter with required reason
        await tx.notification.create({
          data: {
            userId: op.recruiterId,
            type: 'SYSTEM',
            title: `Opening Rejected: ${op.title}`,
            body: `Your opening was rejected: ${cleanReason}`,
            entityType: 'opening',
            entityId: op.id,
          },
        });

        return op;
      });

      SocketService.emitToUser(opening.recruiterId, 'notification:new', {
        notification: {
          title: `Opening Rejected: ${opening.title}`,
          body: `Your opening was rejected: ${cleanReason}`,
        },
      });

      await logAudit(adminId, 'OPENING_REJECTED', 'Opening', openingId, {
        decision,
        reason: cleanReason,
      });

      return updated;
    } else {
      const err: any = new Error('Invalid decision. Must be APPROVE or REJECT.');
      err.statusCode = 400;
      throw err;
    }
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
