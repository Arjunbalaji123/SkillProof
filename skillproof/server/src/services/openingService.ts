import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { NotificationService } from './notificationService.js';

export class OpeningError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CreateOpeningInput {
  title: string;
  trackId: string;
  description: string;
  minLevel?: string | null;
  minScore?: number | null;
  positions?: number;
  skillCatalogIds: string[];
  expiresAt?: Date | string;
}

export interface UpdateOpeningInput {
  title?: string;
  trackId?: string;
  description?: string;
  minLevel?: string | null;
  minScore?: number | null;
  positions?: number;
  status?: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
  skillCatalogIds?: string[];
}

const LEVEL_ORDER = ['Basic', 'Intermediate', 'Advanced', 'Expert'];

export class OpeningService {
  /**
   * Returns the array of allowed skill levels at or above minLevel.
   */
  static getAllowedLevels(minLevel?: string | null): string[] | null {
    if (!minLevel || minLevel === 'ALL' || minLevel.trim() === '') {
      return null;
    }
    const normalized = minLevel.trim().toLowerCase();
    if (normalized === 'beginner') {
      return ['Beginner', ...LEVEL_ORDER];
    }
    const idx = LEVEL_ORDER.findIndex((l) => l.toLowerCase() === normalized);
    if (idx === -1) return null;
    return LEVEL_ORDER.slice(idx);
  }

  /**
   * Backfills DeveloperInterest rows from each user's VERIFIED skills,
   * links any unlinked Skill.skillCatalogId, and ensures existing RECRUITER
   * users have a RecruiterProfile.
   */
  static async backfillInterestsFromVerifiedSkills() {
    const catalogs = await prisma.skillCatalog.findMany();
    const catalogById = new Map(catalogs.map((c) => [c.id, c]));
    const catalogByName = new Map(catalogs.map((c) => [c.name.toLowerCase(), c]));

    const verifiedSkills = await prisma.skill.findMany({
      where: { status: 'VERIFIED' },
      select: {
        id: true,
        userId: true,
        language: true,
        skillCatalogId: true,
      },
    });

    const existingInterests = await prisma.developerInterest.findMany({
      select: {
        userId: true,
        trackId: true,
        skillCatalogId: true,
      },
    });

    const interestKeys = new Set(
      existingInterests.map((i) => `${i.userId}|${i.trackId || ''}|${i.skillCatalogId || ''}`)
    );

    const toCreate: { userId: string; trackId?: string; skillCatalogId?: string }[] = [];

    for (const skill of verifiedSkills) {
      const catalog =
        (skill.skillCatalogId ? catalogById.get(skill.skillCatalogId) : undefined) ||
        catalogByName.get(skill.language.toLowerCase());

      if (!catalog) continue;

      if (!skill.skillCatalogId) {
        await prisma.skill.update({
          where: { id: skill.id },
          data: { skillCatalogId: catalog.id },
        });
      }

      const skillKey = `${skill.userId}||${catalog.id}`;
      if (!interestKeys.has(skillKey)) {
        interestKeys.add(skillKey);
        toCreate.push({ userId: skill.userId, skillCatalogId: catalog.id });
      }

      if (catalog.trackId) {
        const trackKey = `${skill.userId}|${catalog.trackId}|`;
        if (!interestKeys.has(trackKey)) {
          interestKeys.add(trackKey);
          toCreate.push({ userId: skill.userId, trackId: catalog.trackId });
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.developerInterest.createMany({
        data: toCreate,
      });
    }

    // Ensure all existing RECRUITER users have a RecruiterProfile
    const recruitersWithoutProfile = await prisma.user.findMany({
      where: {
        role: 'RECRUITER',
        recruiterProfile: { is: null },
      },
      select: { id: true, name: true },
    });

    for (const rec of recruitersWithoutProfile) {
      await prisma.recruiterProfile.create({
        data: {
          userId: rec.id,
          companyName: `${rec.name.split(' ')[0]}'s Organization`,
          jobTitle: 'Technical Recruiter',
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    }

    return { createdInterests: toCreate.length, backfilledRecruiters: recruitersWithoutProfile.length };
  }

  /**
   * Builds the Prisma `where` clause for matching developers to an opening.
   * Pure database query — never filters in memory.
   */
  private static buildDeveloperMatchWhere(
    opening: {
      recruiterId: string;
      trackId: string;
      minScore: number | null;
      minLevel: string | null;
    },
    skillCatalogIds: string[],
    skillNames: string[],
    options?: { developerId?: string }
  ) {
    const allowedLevels = this.getAllowedLevels(opening.minLevel);

    const skillWhere: any = {
      status: 'VERIFIED',
      OR: [
        { skillCatalogId: { in: skillCatalogIds } },
        ...(skillNames.length > 0 ? [{ language: { in: skillNames } }] : []),
      ],
    };

    if (opening.minScore !== null && opening.minScore !== undefined && opening.minScore > 0) {
      skillWhere.bestScore = { gte: opening.minScore };
    }

    if (allowedLevels && allowedLevels.length > 0) {
      skillWhere.AND = [
        {
          OR: [
            { claimedLevel: { in: allowedLevels } },
            {
              assessments: {
                some: {
                  status: 'SUBMITTED',
                  level: { in: allowedLevels },
                },
              },
            },
          ],
        },
      ];
    }

    return {
      ...(options?.developerId ? { id: options.developerId } : {}),
      role: 'DEVELOPER',
      status: 'ACTIVE',
      isDemo: false,
      profile: {
        isPublic: true,
        allowRecruiterMessages: true,
        notificationsPaused: false,
      },
      skills: {
        some: skillWhere,
      },
      interests: {
        some: {
          OR: [
            { trackId: opening.trackId },
            { skillCatalogId: { in: skillCatalogIds } },
          ],
        },
      },
      blocksCreated: {
        none: {
          blockedId: opening.recruiterId,
        },
      },
      blocksReceived: {
        none: {
          blockerId: opening.recruiterId,
        },
      },
    };
  }

  /**
   * Finds all developers in the database matching a specific opening.
   * Uses a single Prisma query (not in-memory filtering).
   */
  static async findMatchingDevelopers(openingId: string) {
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        skills: {
          include: {
            skillCatalog: true,
          },
        },
      },
    });

    if (!opening) {
      throw new OpeningError('Opening not found', 404);
    }

    const skillCatalogIds = opening.skills.map((s) => s.skillCatalogId);
    const skillNames = opening.skills.map((s) => s.skillCatalog.name);

    if (skillCatalogIds.length === 0) {
      return [];
    }

    const where = this.buildDeveloperMatchWhere(opening, skillCatalogIds, skillNames);

    const matchedDevelopers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isDemo: true,
        profile: {
          select: {
            bio: true,
            githubUrl: true,
            isPublic: true,
            allowRecruiterMessages: true,
            notificationsPaused: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return matchedDevelopers;
  }

  /**
   * Checks in the database whether a specific developer matches an opening.
   */
  static async doesDeveloperMatchOpening(developerId: string, openingId: string): Promise<boolean> {
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        skills: {
          include: {
            skillCatalog: true,
          },
        },
      },
    });

    if (!opening) return false;
    const skillCatalogIds = opening.skills.map((s) => s.skillCatalogId);
    const skillNames = opening.skills.map((s) => s.skillCatalog.name);
    if (skillCatalogIds.length === 0) return false;

    const where = this.buildDeveloperMatchWhere(opening, skillCatalogIds, skillNames, { developerId });
    const count = await prisma.user.count({ where });
    return count > 0;
  }

  /**
   * Creates a new opening (verified recruiters only, max 5 ACTIVE openings).
   * Calls NotificationService.notifyMatches(opening.id) after saving.
   */
  static async createOpening(recruiterId: string, data: CreateOpeningInput) {
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
      include: { recruiterProfile: true },
    });

    if (!recruiter || recruiter.role !== 'RECRUITER') {
      throw new OpeningError('Only recruiters can create openings', 403);
    }

    if (recruiter.status === 'SUSPENDED') {
      throw new OpeningError('Suspended accounts cannot create openings', 403);
    }

    if (!recruiter.recruiterProfile || !recruiter.recruiterProfile.isVerified) {
      throw new OpeningError('Your recruiter account is pending approval and cannot create openings', 403);
    }

    const title = String(data.title || '').trim();
    const description = String(data.description || '').trim();
    const trackId = String(data.trackId || '').trim();

    if (!title || title.length < 3 || title.length > 150) {
      throw new OpeningError('Title must be between 3 and 150 characters', 400);
    }
    if (!description || description.length < 10 || description.length > 5000) {
      throw new OpeningError('Description must be between 10 and 5000 characters', 400);
    }
    if (!trackId) {
      throw new OpeningError('Track is required', 400);
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      throw new OpeningError('Selected track does not exist', 400);
    }

    const uniqueSkillIds = Array.from(
      new Set((data.skillCatalogIds || []).map((id) => String(id).trim()).filter(Boolean))
    );
    if (uniqueSkillIds.length === 0) {
      throw new OpeningError('At least one skill from the catalog is required', 400);
    }

    const existingSkills = await prisma.skillCatalog.findMany({
      where: { id: { in: uniqueSkillIds } },
    });

    if (existingSkills.length !== uniqueSkillIds.length) {
      throw new OpeningError('All opening skills must exist in the skill catalog', 400);
    }

    const activeCount = await prisma.opening.count({
      where: {
        recruiterId,
        status: 'ACTIVE',
      },
    });

    if (activeCount >= 5) {
      throw new OpeningError('You can have at most 5 active openings at a time', 400);
    }

    const minScore =
      data.minScore !== null && data.minScore !== undefined && String(data.minScore) !== ''
        ? Math.max(0, Math.min(100, Number(data.minScore)))
        : null;

    const minLevel =
      data.minLevel && data.minLevel !== 'ALL' && String(data.minLevel).trim() !== ''
        ? String(data.minLevel).trim()
        : null;

    const positions = Math.max(1, Math.min(100, Number(data.positions || 1)));
    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const opening = await prisma.opening.create({
      data: {
        recruiterId,
        title,
        trackId,
        description,
        minLevel,
        minScore,
        positions,
        status: 'ACTIVE',
        expiresAt,
        skills: {
          create: uniqueSkillIds.map((skillCatalogId) => ({
            skillCatalogId,
          })),
        },
      },
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
                companyWebsite: true,
                linkedinUrl: true,
                bio: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    await logAudit(recruiterId, 'OPENING_CREATED', 'Opening', opening.id, {
      title: opening.title,
      trackId: opening.trackId,
      skillCatalogIds: uniqueSkillIds,
      minLevel: opening.minLevel,
      minScore: opening.minScore,
      positions: opening.positions,
    });

    // Notify matched developers
    await NotificationService.notifyMatches(opening.id);

    return this.formatOpening(opening);
  }

  /**
   * Updates an opening (edit, pause, close).
   * Enforces max 5 active openings if reactivating.
   */
  static async updateOpening(
    actorId: string,
    openingId: string,
    data: UpdateOpeningInput,
    isAdmin = false
  ) {
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: { skills: true },
    });

    if (!opening) {
      throw new OpeningError('Opening not found', 404);
    }

    if (!isAdmin && opening.recruiterId !== actorId) {
      throw new OpeningError('Access denied: you do not own this opening', 403);
    }

    if (data.status === 'ACTIVE' && opening.status !== 'ACTIVE') {
      const activeCount = await prisma.opening.count({
        where: {
          recruiterId: opening.recruiterId,
          status: 'ACTIVE',
          id: { not: openingId },
        },
      });
      if (activeCount >= 5) {
        throw new OpeningError('You can have at most 5 active openings at a time', 400);
      }
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      const title = String(data.title).trim();
      if (title.length < 3 || title.length > 150) {
        throw new OpeningError('Title must be between 3 and 150 characters', 400);
      }
      updateData.title = title;
    }

    if (data.description !== undefined) {
      const description = String(data.description).trim();
      if (description.length < 10 || description.length > 5000) {
        throw new OpeningError('Description must be between 10 and 5000 characters', 400);
      }
      updateData.description = description;
    }

    if (data.trackId !== undefined) {
      const track = await prisma.track.findUnique({ where: { id: data.trackId } });
      if (!track) {
        throw new OpeningError('Selected track does not exist', 400);
      }
      updateData.trackId = data.trackId;
    }

    if (data.minScore !== undefined) {
      updateData.minScore =
        data.minScore !== null && String(data.minScore) !== ''
          ? Math.max(0, Math.min(100, Number(data.minScore)))
          : null;
    }

    if (data.minLevel !== undefined) {
      updateData.minLevel =
        data.minLevel && data.minLevel !== 'ALL' && String(data.minLevel).trim() !== ''
          ? String(data.minLevel).trim()
          : null;
    }

    if (data.positions !== undefined) {
      updateData.positions = Math.max(1, Math.min(100, Number(data.positions)));
    }

    if (data.status !== undefined) {
      if (!['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].includes(data.status)) {
        throw new OpeningError('Invalid opening status', 400);
      }
      updateData.status = data.status;
    }

    let uniqueSkillIds: string[] | undefined;
    if (data.skillCatalogIds !== undefined) {
      uniqueSkillIds = Array.from(
        new Set(data.skillCatalogIds.map((id) => String(id).trim()).filter(Boolean))
      );
      if (uniqueSkillIds.length === 0) {
        throw new OpeningError('At least one skill from the catalog is required', 400);
      }
      const existingSkills = await prisma.skillCatalog.findMany({
        where: { id: { in: uniqueSkillIds } },
      });
      if (existingSkills.length !== uniqueSkillIds.length) {
        throw new OpeningError('All opening skills must exist in the skill catalog', 400);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (uniqueSkillIds) {
        await tx.openingSkill.deleteMany({ where: { openingId } });
        await tx.openingSkill.createMany({
          data: uniqueSkillIds.map((skillCatalogId) => ({
            openingId,
            skillCatalogId,
          })),
        });
      }

      return tx.opening.update({
        where: { id: openingId },
        data: updateData,
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
                  companyWebsite: true,
                  linkedinUrl: true,
                  bio: true,
                  isVerified: true,
                },
              },
            },
          },
          approaches: {
            select: { status: true },
          },
        },
      });
    });

    await logAudit(actorId, 'OPENING_UPDATED', 'Opening', openingId, {
      changes: updateData,
      isAdmin,
    });

    return this.formatOpening(updated);
  }

  /**
   * Lists all openings created by the given recruiter.
   */
  static async getRecruiterOpenings(recruiterId: string) {
    await this.expireOverdueOpenings();

    const openings = await prisma.opening.findMany({
      where: { recruiterId },
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
                companyWebsite: true,
                linkedinUrl: true,
                bio: true,
                isVerified: true,
              },
            },
          },
        },
        approaches: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return openings.map((o) => this.formatOpening(o));
  }

  /**
   * Lists active, non-expired openings that match the given developer.
   */
  static async getMatchingOpeningsForDeveloper(developerId: string) {
    await this.expireOverdueOpenings();

    const dev = await prisma.user.findUnique({
      where: { id: developerId },
      include: {
        profile: true,
        skills: {
          where: { status: 'VERIFIED' },
          include: {
            skillCatalog: true,
            assessments: {
              where: { status: 'SUBMITTED' },
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
        interests: true,
        blocksCreated: true,
        blocksReceived: true,
      },
    });

    if (!dev || dev.role !== 'DEVELOPER' || dev.status === 'SUSPENDED') {
      return [];
    }

    const activeOpenings = await prisma.opening.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
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
                companyWebsite: true,
                linkedinUrl: true,
                bio: true,
                isVerified: true,
              },
            },
          },
        },
        approaches: {
          where: { developerId },
          take: 1,
        },
        conversations: {
          where: { developerId },
          select: { id: true, status: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matched: any[] = [];
    for (const opening of activeOpenings) {
      const isMatch = await this.doesDeveloperMatchOpening(developerId, opening.id);
      if (isMatch || opening.approaches.length > 0) {
        matched.push({
          ...this.formatOpening(opening),
          myApproach: opening.approaches[0] || null,
          conversationId: opening.conversations[0]?.id || null,
          conversationStatus: opening.conversations[0]?.status || null,
          isEligibleToApproach: isMatch && opening.approaches.length === 0,
        });
      }
    }

    return matched;
  }

  /**
   * Returns details of a single opening + recruiter profile + viewer's approach status.
   */
  static async getOpeningDetails(viewerId: string, openingId: string) {
    await this.expireOverdueOpenings();

    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
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
                companyWebsite: true,
                linkedinUrl: true,
                bio: true,
                isVerified: true,
              },
            },
          },
        },
        approaches: {
          where: { developerId: viewerId },
          take: 1,
        },
      },
    });

    if (!opening) {
      throw new OpeningError('Opening not found', 404);
    }

    const pairConversation = await prisma.conversation.findUnique({
      where: {
        recruiterId_developerId: {
          recruiterId: opening.recruiterId,
          developerId: viewerId,
        },
      },
      select: { id: true, status: true, origin: true },
    });

    const isMatch = await this.doesDeveloperMatchOpening(viewerId, opening.id);

    // Count remaining approaches today for this developer
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const approachesToday = await prisma.approach.count({
      where: {
        developerId: viewerId,
        createdAt: { gte: startOfToday },
      },
    });

    return {
      ...this.formatOpening(opening),
      myApproach: opening.approaches[0] || null,
      conversationId: pairConversation?.id || null,
      conversationStatus: pairConversation?.status || null,
      isMatch,
      isEligibleToApproach:
        opening.status === 'ACTIVE' &&
        new Date(opening.expiresAt) > new Date() &&
        isMatch &&
        opening.approaches.length === 0 &&
        approachesToday < 5,
      remainingApproachesToday: Math.max(0, 5 - approachesToday),
    };
  }

  /**
   * Returns applicants (approaches) for an opening, ranked by verified score
   * in the opening's skills (descending), with level and per-topic breakdown.
   */
  static async getOpeningApplicants(recruiterId: string, openingId: string, isAdmin = false) {
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
      include: {
        skills: {
          include: {
            skillCatalog: true,
          },
        },
      },
    });

    if (!opening) {
      throw new OpeningError('Opening not found', 404);
    }

    if (!isAdmin && opening.recruiterId !== recruiterId) {
      throw new OpeningError('Access denied: you do not own this opening', 403);
    }

    const openingSkillIds = new Set(opening.skills.map((s) => s.skillCatalogId));
    const openingSkillNames = new Set(opening.skills.map((s) => s.skillCatalog.name.toLowerCase()));

    const approaches = await prisma.approach.findMany({
      where: { openingId },
      include: {
        developer: {
          select: {
            id: true,
            name: true,
            username: true,
            isDemo: true,
            profile: {
              select: {
                bio: true,
                githubUrl: true,
              },
            },
            skills: {
              where: { status: 'VERIFIED' },
              include: {
                skillCatalog: true,
                assessments: {
                  where: { status: 'SUBMITTED' },
                  orderBy: { submittedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const conversations = await prisma.conversation.findMany({
      where: {
        recruiterId: opening.recruiterId,
        developerId: { in: approaches.map((a) => a.developerId) },
      },
      select: {
        id: true,
        developerId: true,
        status: true,
      },
    });

    const convByDevId = new Map(conversations.map((c) => [c.developerId, c]));

    const formatted = approaches.map((app) => {
      const verifiedSkills = app.developer.skills.map((s) => {
        const latestAssessment = s.assessments[0];
        let topicBreakdown: Record<string, any> = {};
        if (latestAssessment?.topicBreakdown) {
          try {
            topicBreakdown = JSON.parse(latestAssessment.topicBreakdown);
          } catch {
            topicBreakdown = {};
          }
        }
        const topicStrengths = Object.entries(topicBreakdown).map(([topic, stat]: [string, any]) => ({
          topic,
          accuracy: stat?.accuracy ?? 0,
          strength:
            (stat?.accuracy ?? 0) >= 75
              ? 'Strong'
              : (stat?.accuracy ?? 0) >= 60
              ? 'Proficient'
              : 'Needs Focus',
        }));

        const isOpeningSkill =
          (s.skillCatalogId && openingSkillIds.has(s.skillCatalogId)) ||
          openingSkillNames.has(s.language.toLowerCase());

        return {
          skillId: s.id,
          skillCatalogId: s.skillCatalogId,
          language: s.language,
          score: s.bestScore ?? 0,
          level: latestAssessment?.level || s.claimedLevel || 'Basic',
          verifiedAt: s.verifiedAt,
          isOpeningSkill,
          topicBreakdown,
          topicStrengths,
        };
      });

      const matchingSkills = verifiedSkills.filter((s) => s.isOpeningSkill);
      const matchingScore =
        matchingSkills.length > 0
          ? Math.max(...matchingSkills.map((s) => s.score))
          : verifiedSkills.length > 0
          ? Math.max(...verifiedSkills.map((s) => s.score))
          : 0;

      const conv = convByDevId.get(app.developerId);

      return {
        id: app.id,
        openingId: app.openingId,
        developerId: app.developerId,
        message: app.message,
        status: app.status,
        createdAt: app.createdAt,
        decidedAt: app.decidedAt,
        matchingScore,
        conversationId: conv?.id || null,
        conversationStatus: conv?.status || null,
        developer: {
          id: app.developer.id,
          name: app.developer.name,
          username: app.developer.username,
          isDemo: Boolean(app.developer.isDemo),
          bio: app.developer.profile?.bio || null,
          githubUrl: app.developer.profile?.githubUrl || null,
          verifiedSkills,
        },
      };
    });

    // Rank by verified score in the opening skills descending
    formatted.sort((a, b) => b.matchingScore - a.matchingScore);

    return formatted;
  }

  /**
   * Hourly job: sets overdue ACTIVE or PAUSED openings to EXPIRED.
   * Accepted conversations stay open.
   */
  static async expireOverdueOpenings() {
    const now = new Date();
    const result = await prisma.opening.updateMany({
      where: {
        status: { in: ['ACTIVE', 'PAUSED'] },
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });
    return { expiredCount: result.count };
  }

  private static formatOpening(opening: any) {
    const approaches = opening.approaches || [];
    return {
      id: opening.id,
      recruiterId: opening.recruiterId,
      title: opening.title,
      trackId: opening.trackId,
      track: opening.track
        ? {
            id: opening.track.id,
            slug: opening.track.slug,
            title: opening.track.title,
          }
        : null,
      description: opening.description,
      minLevel: opening.minLevel,
      minScore: opening.minScore,
      positions: opening.positions,
      status: opening.status,
      expiresAt: opening.expiresAt,
      createdAt: opening.createdAt,
      updatedAt: opening.updatedAt,
      skills: (opening.skills || []).map((s: any) => ({
        id: s.skillCatalog?.id || s.skillCatalogId,
        skillCatalogId: s.skillCatalogId,
        name: s.skillCatalog?.name || '',
        slug: s.skillCatalog?.slug || '',
      })),
      recruiter: opening.recruiter
        ? {
            id: opening.recruiter.id,
            name: opening.recruiter.name,
            username: opening.recruiter.username,
            isDemo: Boolean(opening.recruiter.isDemo),
            companyName: opening.recruiter.recruiterProfile?.companyName || '',
            jobTitle: opening.recruiter.recruiterProfile?.jobTitle || '',
            companyWebsite: opening.recruiter.recruiterProfile?.companyWebsite || null,
            linkedinUrl: opening.recruiter.recruiterProfile?.linkedinUrl || null,
            bio: opening.recruiter.recruiterProfile?.bio || null,
            isVerified: Boolean(opening.recruiter.recruiterProfile?.isVerified),
          }
        : null,
      applicantCounts: {
        total: approaches.length,
        pending: approaches.filter((a: any) => a.status === 'PENDING').length,
        accepted: approaches.filter((a: any) => a.status === 'ACCEPTED').length,
        declined: approaches.filter((a: any) => a.status === 'DECLINED').length,
        saved: approaches.filter((a: any) => a.status === 'SAVED').length,
      },
    };
  }
}
