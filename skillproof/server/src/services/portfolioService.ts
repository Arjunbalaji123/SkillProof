import { prisma } from '../config/db.js';
import { LeaderboardService } from './leaderboardService.js';
import { logAudit } from '../utils/audit.js';

export class PortfolioService {
  /**
   * Public developer portfolio.
   * Matches by username or publicSlug.
   * Clearly separates VERIFIED skills (with scores & level) from CLAIMED skills.
   * NEVER returns emails!
   */
  static async getPublicPortfolioBySlug(identifier: string, viewerId?: string) {
    const cleanId = (identifier || '').trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { profile: { publicSlug: cleanId } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        isDemo: true,
        profile: true,
        skills: {
          include: {
            assessments: {
              where: { status: 'SUBMITTED' },
              orderBy: { weightedPercent: 'desc' },
              take: 1,
            },
          },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            repoUrl: true,
            techStack: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.profile || !user.profile.isPublic) {
      return null;
    }

    let isBookmarked = false;
    let bookmarkNote: string | null = null;
    if (viewerId && viewerId !== user.id) {
      const bm = await prisma.bookmark.findUnique({
        where: {
          recruiterId_developerId: {
            recruiterId: viewerId,
            developerId: user.id,
          },
        },
      });
      if (bm) {
        isBookmarked = true;
        bookmarkNote = bm.note || null;
      }
    }

    const profile = user.profile;

    const verifiedSkills = user.skills
      .filter((s) => s.status === 'VERIFIED')
      .map((s) => {
        const derivedLevel =
          s.assessments[0]?.level ||
          (s.bestScore
            ? s.bestScore >= 90
              ? 'Expert'
              : s.bestScore >= 75
              ? 'Advanced'
              : s.bestScore >= 60
              ? 'Intermediate'
              : s.bestScore >= 40
              ? 'Basic'
              : 'Beginner'
            : 'Basic');
        const topicBreakdown = s.assessments[0]?.topicBreakdown
          ? JSON.parse(s.assessments[0].topicBreakdown)
          : {};
        const topicStrengths = Object.entries(topicBreakdown).map(([topic, stat]: any) => ({
          topic,
          accuracy: stat.accuracy,
          strength: stat.accuracy >= 75 ? 'Strong' : stat.accuracy >= 60 ? 'Proficient' : 'Needs Focus',
        }));

        return {
          id: s.id,
          language: s.language,
          score: s.bestScore,
          level: derivedLevel,
          claimedLevel: s.claimedLevel,
          certificateUrl: s.certificateUrl,
          verifiedAt: s.verifiedAt,
          expiresAt: s.expiresAt,
          topicBreakdown,
          topicStrengths,
        };
      });

    const claimedSkills = user.skills
      .filter((s) => s.status === 'CLAIMED')
      .map((s) => ({
        id: s.id,
        language: s.language,
        claimedLevel: s.claimedLevel,
        earnedLevel: s.assessments[0]?.level || null,
        lastScore: s.assessments[0]?.weightedPercent ?? null,
        certificateUrl: s.certificateUrl,
        verified: false,
      }));

    const certificates = user.skills
      .filter((s) => Boolean(s.certificateUrl))
      .map((s) => ({
        id: s.id,
        language: s.language,
        claimedLevel: s.claimedLevel,
        certificateUrl: s.certificateUrl,
        label: 'Unverified claim',
        verified: false,
      }));

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isDemo: Boolean(user.isDemo),
      allowRecruiterMessages: Boolean(profile.allowRecruiterMessages),
      canDirectMessage: Boolean(
        profile.isPublic &&
          profile.allowRecruiterMessages &&
          !user.isDemo &&
          user.status === 'ACTIVE' &&
          verifiedSkills.length > 0
      ),
      isBookmarked,
      bookmarkNote,
      bio: profile.bio,
      githubUrl: profile.githubUrl,
      publicSlug: user.username,
      redirectToUsername: user.username && user.username !== cleanId ? user.username : undefined,
      verifiedSkills,
      claimedSkills,
      certificates,
      projects: user.projects,
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      bio?: string;
      githubUrl?: string;
      isPublic?: boolean;
      publicSlug?: string;
      showOnLeaderboard?: boolean;
      allowRecruiterMessages?: boolean;
      notificationsPaused?: boolean;
      companyName?: string;
      jobTitle?: string;
      companyWebsite?: string;
      linkedinUrl?: string;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true },
    });

    const slugFromUsername = user?.username || data.publicSlug || userId.slice(0, 12);

    const profile = await prisma.developerProfile.upsert({
      where: { userId },
      update: {
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.githubUrl !== undefined ? { githubUrl: data.githubUrl } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.showOnLeaderboard !== undefined ? { showOnLeaderboard: data.showOnLeaderboard } : {}),
        ...(data.allowRecruiterMessages !== undefined
          ? { allowRecruiterMessages: Boolean(data.allowRecruiterMessages) }
          : {}),
        ...(data.notificationsPaused !== undefined
          ? { notificationsPaused: Boolean(data.notificationsPaused) }
          : {}),
        publicSlug: slugFromUsername,
      },
      create: {
        userId,
        publicSlug: slugFromUsername,
        bio: data.bio || '',
        githubUrl: data.githubUrl || '',
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        showOnLeaderboard: data.showOnLeaderboard !== undefined ? data.showOnLeaderboard : true,
        allowRecruiterMessages:
          data.allowRecruiterMessages !== undefined ? Boolean(data.allowRecruiterMessages) : true,
        notificationsPaused:
          data.notificationsPaused !== undefined ? Boolean(data.notificationsPaused) : false,
      },
    });

    if (
      user?.role === 'RECRUITER' &&
      (data.companyName !== undefined ||
        data.jobTitle !== undefined ||
        data.companyWebsite !== undefined ||
        data.linkedinUrl !== undefined ||
        data.bio !== undefined)
    ) {
      await prisma.recruiterProfile.upsert({
        where: { userId },
        update: {
          ...(data.companyName !== undefined ? { companyName: data.companyName.trim() } : {}),
          ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle.trim() } : {}),
          ...(data.companyWebsite !== undefined
            ? { companyWebsite: data.companyWebsite.trim() || null }
            : {}),
          ...(data.linkedinUrl !== undefined ? { linkedinUrl: data.linkedinUrl.trim() || null } : {}),
          ...(data.bio !== undefined ? { bio: data.bio } : {}),
        },
        create: {
          userId,
          companyName: data.companyName?.trim() || 'Company',
          jobTitle: data.jobTitle?.trim() || 'Recruiter',
          companyWebsite: data.companyWebsite?.trim() || null,
          linkedinUrl: data.linkedinUrl?.trim() || null,
          bio: data.bio || null,
          isVerified: false,
        },
      });
    }

    if (data.showOnLeaderboard !== undefined) {
      await LeaderboardService.recalculateUser(userId);
    }

    await logAudit(userId, 'PROFILE_UPDATED', 'DeveloperProfile', profile.id, {
      allowRecruiterMessages: profile.allowRecruiterMessages,
      notificationsPaused: profile.notificationsPaused,
    });

    return profile;
  }

  static async getInterests(userId: string) {
    const interests = await prisma.developerInterest.findMany({
      where: { userId },
      include: {
        track: true,
        skillCatalog: true,
      },
    });
    return {
      trackIds: interests.filter((i) => i.trackId).map((i) => i.trackId!),
      skillIds: interests.filter((i) => i.skillCatalogId).map((i) => i.skillCatalogId!),
      interests,
    };
  }

  static async updateInterests(userId: string, trackIds: string[] = [], skillIds: string[] = []) {
    const uniqueTrackIds = Array.from(
      new Set((Array.isArray(trackIds) ? trackIds : []).map((id) => String(id).trim()).filter(Boolean))
    );
    const uniqueSkillIds = Array.from(
      new Set((Array.isArray(skillIds) ? skillIds : []).map((id) => String(id).trim()).filter(Boolean))
    );

    const validTracks =
      uniqueTrackIds.length > 0
        ? await prisma.track.findMany({
            where: { id: { in: uniqueTrackIds } },
            select: { id: true },
          })
        : [];

    const validSkills =
      uniqueSkillIds.length > 0
        ? await prisma.skillCatalog.findMany({
            where: { id: { in: uniqueSkillIds } },
            select: { id: true },
          })
        : [];

    await prisma.$transaction(async (tx) => {
      await tx.developerInterest.deleteMany({ where: { userId } });

      const rowsToCreate: { userId: string; trackId?: string; skillCatalogId?: string }[] = [
        ...validTracks.map((t) => ({ userId, trackId: t.id })),
        ...validSkills.map((s) => ({ userId, skillCatalogId: s.id })),
      ];

      if (rowsToCreate.length > 0) {
        await tx.developerInterest.createMany({ data: rowsToCreate });
      }
    });

    const interests = await prisma.developerInterest.findMany({
      where: { userId },
      include: {
        track: true,
        skillCatalog: true,
      },
    });

    await logAudit(userId, 'INTERESTS_UPDATED', 'DeveloperInterest', userId, {
      trackCount: validTracks.length,
      skillCount: validSkills.length,
    });

    return {
      trackIds: interests.filter((i) => i.trackId).map((i) => i.trackId!),
      skillIds: interests.filter((i) => i.skillCatalogId).map((i) => i.skillCatalogId!),
      interests,
    };
  }

  static async updateMessagingSettings(userId: string, allowRecruiterMessages: boolean) {
    const profile = await this.updateProfile(userId, {
      allowRecruiterMessages: Boolean(allowRecruiterMessages),
    });
    await logAudit(userId, 'MESSAGING_SETTINGS_UPDATED', 'DeveloperProfile', profile.id, {
      allowRecruiterMessages: profile.allowRecruiterMessages,
    });
    return {
      allowRecruiterMessages: profile.allowRecruiterMessages,
    };
  }

  static async updateNotificationSettings(userId: string, notificationsPaused: boolean) {
    const profile = await this.updateProfile(userId, {
      notificationsPaused: Boolean(notificationsPaused),
    });
    await logAudit(userId, 'NOTIFICATION_SETTINGS_UPDATED', 'DeveloperProfile', profile.id, {
      notificationsPaused: profile.notificationsPaused,
    });
    return {
      notificationsPaused: profile.notificationsPaused,
    };
  }
}


