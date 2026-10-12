import { prisma } from '../config/db.js';
import { Prisma } from '@prisma/client';

export const LEVEL_MULTIPLIERS: Record<string, number> = {
  Expert: 3.0,
  Advanced: 2.0,
  Intermediate: 1.5,
  Basic: 1.0,
  Beginner: 0.0,
};

function getWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface CalculatedUserPoints {
  userId: string;
  points: number;
  earliestVerifiedAt: Date | null;
  verifiedSkills: {
    language: string;
    level: string;
    bestScore: number;
    skillPoints: number;
    isExpired: boolean;
  }[];
  extraSkillsBonus: number;
  weeklyBonus: number;
  topLevel: string;
}

export class LeaderboardService {
  /**
   * Reads user's VERIFIED skills (bestScore, level, verifiedAt, expiresAt) and
   * SUBMITTED, integrity-clean assessments (tabSwitchCount < 3).
   * Applies level multiplier, hard-question bonus, breadth bonus (+25 per extra verified skill in GLOBAL),
   * and weekly activity bonus (+5 per week, cap 50). Expired skills count at 50%.
   */
  static async calculatePoints(
    userId: string,
    options: {
      scope?: 'GLOBAL' | 'TRACK' | 'SKILL';
      scopeId?: string | null;
      period?: 'ALL' | 'MONTH';
      periodKey?: string;
    } = {},
    db: Prisma.TransactionClient = prisma
  ): Promise<CalculatedUserPoints | null> {
    const { scope = 'GLOBAL', scopeId, period = 'ALL', periodKey } = options;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          where: { status: 'VERIFIED' },
          include: {
            skillCatalog: true,
          },
        },
        assessments: {
          where: {
            status: 'SUBMITTED',
            tabSwitchCount: { lt: 3 }, // Integrity clean
            ...(period === 'MONTH'
              ? {
                  submittedAt: {
                    gte: periodKey
                      ? new Date(`${periodKey}-01T00:00:00Z`)
                      : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  },
                }
              : {}),
          },
          include: {
            questions: {
              include: {
                question: { select: { difficulty: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status === 'SUSPENDED') return null;
    if (user.profile && user.profile.showOnLeaderboard === false) {
      return null;
    }

    // Filter skills based on scope
    let relevantSkills = user.skills;
    if (scope === 'TRACK' && scopeId) {
      relevantSkills = relevantSkills.filter((s) => s.skillCatalog?.trackId === scopeId);
    } else if (scope === 'SKILL' && scopeId) {
      relevantSkills = relevantSkills.filter(
        (s) =>
          s.skillCatalogId === scopeId ||
          s.language.toLowerCase() === scopeId.toLowerCase()
      );
    }

    if (relevantSkills.length === 0) {
      return null;
    }

    let sumSkillPoints = 0;
    let earliestVerifiedAt: Date | null = null;
    const verifiedDetails: CalculatedUserPoints['verifiedSkills'] = [];
    const now = new Date();

    for (const skill of relevantSkills) {
      const level = skill.claimedLevel || 'Basic';
      const mult = LEVEL_MULTIPLIERS[level] ?? 1.0;
      const base = (skill.bestScore || 0) * mult;

      // Hard question bonus: unique HARD questions answered correctly in valid assessments
      const hardCorrectQuestionIds = new Set<string>();
      const skillAssessments = user.assessments.filter(
        (a) => a.language.toLowerCase() === skill.language.toLowerCase()
      );

      for (const a of skillAssessments) {
        for (const q of a.questions) {
          if (q.question.difficulty === 'HARD' && q.isCorrect) {
            hardCorrectQuestionIds.add(q.questionId);
          }
        }
      }

      const hardBonus = Math.min(hardCorrectQuestionIds.size * 2.5, 10);
      let skillTotal = base + hardBonus;

      const isExpired = !!(skill.expiresAt && skill.expiresAt < now);
      if (isExpired) {
        skillTotal = skillTotal * 0.5;
      }

      sumSkillPoints += skillTotal;

      if (skill.verifiedAt) {
        if (!earliestVerifiedAt || skill.verifiedAt < earliestVerifiedAt) {
          earliestVerifiedAt = skill.verifiedAt;
        }
      }

      verifiedDetails.push({
        language: skill.language,
        level,
        bestScore: skill.bestScore || 0,
        skillPoints: Math.round(skillTotal * 10) / 10,
        isExpired,
      });
    }

    // Extra verified skills breadth bonus: +25 per extra verified skill in GLOBAL scope
    const extraSkillsBonus = scope === 'GLOBAL' ? Math.max(0, relevantSkills.length - 1) * 25 : 0;

    // Weekly consistency bonus: +5 per week with a completed assessment (cap 50)
    const relevantAssessments = user.assessments.filter((a) => {
      if (scope === 'SKILL' && scopeId) {
        return a.language.toLowerCase() === scopeId.toLowerCase();
      }
      if (scope === 'TRACK' && scopeId) {
        return relevantSkills.some((s) => s.language.toLowerCase() === a.language.toLowerCase());
      }
      return true;
    });

    const distinctWeeks = new Set<string>();
    for (const a of relevantAssessments) {
      if (a.submittedAt) {
        distinctWeeks.add(getWeekKey(a.submittedAt));
      }
    }
    const weeklyBonus = Math.min(distinctWeeks.size * 5, 50);

    const totalPoints = Math.round((sumSkillPoints + extraSkillsBonus + weeklyBonus) * 10) / 10;

    // Find highest level badge
    const levelsRank = ['Expert', 'Advanced', 'Intermediate', 'Basic', 'Beginner'];
    let topLevel = 'Beginner';
    for (const l of levelsRank) {
      if (verifiedDetails.some((v) => v.level === l)) {
        topLevel = l;
        break;
      }
    }

    return {
      userId: user.id,
      points: totalPoints,
      earliestVerifiedAt,
      verifiedSkills: verifiedDetails,
      extraSkillsBonus,
      weeklyBonus,
      topLevel,
    };
  }

  // Alias for backward compatibility with unit tests
  static calculateUserPoints(userId: string, options: any = {}) {
    const scope = (options.scope || 'GLOBAL').toUpperCase() as any;
    const period = (options.period || 'ALL').toUpperCase() as any;
    const scopeId = scope === 'TRACK' ? options.trackId : scope === 'SKILL' ? options.skillId : null;
    return this.calculatePoints(userId, { scope, scopeId, period, periodKey: period === 'MONTH' ? getCurrentMonthKey() : 'all' });
  }

  /**
   * Recalculates and upserts that user's entries for GLOBAL, their tracks, their skills, and the current month.
   * Can run within an existing transaction client `tx` or the default Prisma client.
   */
  static async recalculateUser(userId: string, tx: Prisma.TransactionClient = prisma): Promise<void> {
    const currentMonthKey = getCurrentMonthKey();

    // Check if user is active and should be on leaderboard
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          where: { status: 'VERIFIED' },
          include: { skillCatalog: true },
        },
      },
    });

    // If user is suspended or showOnLeaderboard = false or has 0 verified skills or user deleted/missing, remove all their entries
    if (!user || user.status === 'SUSPENDED' || (user.profile && user.profile.showOnLeaderboard === false) || user.skills.length === 0) {
      await tx.leaderboardEntry.deleteMany({
        where: { userId },
      });
      // Recompute ranks for all scopes user might have been in
      await this.recomputeAllRanks(tx);
      return;
    }

    // Determine all relevant scopes for this user
    interface TargetScope {
      scope: 'GLOBAL' | 'TRACK' | 'SKILL';
      scopeId: string;
      period: 'ALL' | 'MONTH';
      periodKey: string;
    }

    const targetScopes: TargetScope[] = [
      { scope: 'GLOBAL', scopeId: '', period: 'ALL', periodKey: 'all' },
      { scope: 'GLOBAL', scopeId: '', period: 'MONTH', periodKey: currentMonthKey },
    ];

    // Collect distinct tracks and skills
    const trackIds = new Set<string>();
    const skillIds = new Set<string>();

    for (const skill of user.skills) {
      if (skill.skillCatalog?.trackId) {
        trackIds.add(skill.skillCatalog.trackId);
      }
      if (skill.skillCatalogId) {
        skillIds.add(skill.skillCatalogId);
      }
      skillIds.add(skill.language);
    }

    for (const trackId of trackIds) {
      targetScopes.push({ scope: 'TRACK', scopeId: trackId, period: 'ALL', periodKey: 'all' });
      targetScopes.push({ scope: 'TRACK', scopeId: trackId, period: 'MONTH', periodKey: currentMonthKey });
    }

    for (const skillId of skillIds) {
      targetScopes.push({ scope: 'SKILL', scopeId: skillId, period: 'ALL', periodKey: 'all' });
      targetScopes.push({ scope: 'SKILL', scopeId: skillId, period: 'MONTH', periodKey: currentMonthKey });
    }

    // For each scope, calculate points and upsert
    for (const target of targetScopes) {
      const calc = await this.calculatePoints(userId, target, tx);

      if (calc && calc.points > 0) {
        const verifiedSkillsNames = JSON.stringify(calc.verifiedSkills.map((v) => v.language));
        await tx.leaderboardEntry.upsert({
          where: {
            userId_scope_scopeId_period_periodKey: {
              userId,
              scope: target.scope,
              scopeId: target.scopeId,
              period: target.period,
              periodKey: target.periodKey,
            },
          },
          create: {
            userId,
            scope: target.scope,
            scopeId: target.scopeId,
            period: target.period,
            periodKey: target.periodKey,
            points: calc.points,
            verifiedSkills: verifiedSkillsNames,
            rank: 0, // will be assigned in recomputeRanks
          },
          update: {
            points: calc.points,
            verifiedSkills: verifiedSkillsNames,
          },
        });
      } else {
        // User has 0 points or no verified skills in this scope: remove entry
        await tx.leaderboardEntry.deleteMany({
          where: {
            userId,
            scope: target.scope,
            scopeId: target.scopeId,
            period: target.period,
            periodKey: target.periodKey,
          },
        });
      }
    }

    // Remove any stale entries for this user that are no longer in targetScopes
    // (e.g. if a skill was removed)
    const existingEntries = await tx.leaderboardEntry.findMany({
      where: { userId },
      select: { id: true, scope: true, scopeId: true, period: true, periodKey: true },
    });

    for (const entry of existingEntries) {
      const isTarget = targetScopes.some(
        (t) =>
          t.scope === entry.scope &&
          t.scopeId === entry.scopeId &&
          t.period === entry.period &&
          t.periodKey === entry.periodKey
      );
      if (!isTarget) {
        await tx.leaderboardEntry.delete({ where: { id: entry.id } });
      }
    }

    // Recompute ranks for each affected scope
    for (const target of targetScopes) {
      await this.recomputeRanks(target.scope, target.scopeId, target.period, target.periodKey, tx);
    }
  }

  /**
   * Assign ranks with ORDER BY points DESC, earliest verifiedAt ASC, userId ASC.
   */
  static async recomputeRanks(
    scope: 'GLOBAL' | 'TRACK' | 'SKILL',
    scopeId: string | null,
    period: 'ALL' | 'MONTH',
    periodKey: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    const entries: any[] = await tx.leaderboardEntry.findMany({
      where: {
        scope,
        scopeId: scopeId || '',
        period,
        periodKey,
      },
      include: {
        user: {
          include: {
            skills: {
              where: { status: 'VERIFIED' },
              select: { verifiedAt: true, language: true, skillCatalogId: true, skillCatalog: { select: { trackId: true } } },
            },
          },
        },
      },
    });

    if (entries.length === 0) return;

    // Sort: points DESC, earliest verifiedAt ASC, userId ASC
    entries.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      // Find earliest verifiedAt in the relevant scope
      const getEarliest = (entry: any) => {
        let skills: any[] = entry.user?.skills || [];
        if (scope === 'TRACK' && scopeId) {
          skills = skills.filter((s: any) => s.skillCatalog?.trackId === scopeId);
        } else if (scope === 'SKILL' && scopeId) {
          skills = skills.filter((s: any) => s.skillCatalogId === scopeId || s.language.toLowerCase() === scopeId.toLowerCase());
        }
        let minTime: number | null = null;
        for (const s of skills) {
          if (s.verifiedAt) {
            const t = new Date(s.verifiedAt).getTime();
            if (minTime === null || t < minTime) minTime = t;
          }
        }
        return minTime;
      };

      const earlyA = getEarliest(a);
      const earlyB = getEarliest(b);

      if (earlyA !== null && earlyB !== null && earlyA !== earlyB) {
        return earlyA - earlyB;
      }
      if (earlyA !== null && earlyB === null) return -1;
      if (earlyA === null && earlyB !== null) return 1;

      return a.userId.localeCompare(b.userId);
    });

    // Update rank in database
    for (let i = 0; i < entries.length; i++) {
      const rank = i + 1;
      if (entries[i].rank !== rank) {
        await tx.leaderboardEntry.update({
          where: { id: entries[i].id },
          data: { rank },
        });
      }
    }
  }

  /**
   * Recompute ranks across all active scopes and periods.
   */
  static async recomputeAllRanks(tx: Prisma.TransactionClient = prisma): Promise<void> {
    const distinctGroups = await tx.leaderboardEntry.groupBy({
      by: ['scope', 'scopeId', 'period', 'periodKey'],
    });

    for (const group of distinctGroups) {
      await this.recomputeRanks(
        group.scope as any,
        group.scopeId,
        group.period as any,
        group.periodKey,
        tx
      );
    }
  }

  /**
   * Safety Net: Consistency check that runs after every submit and in rebuild script.
   * For each LeaderboardEntry, verifiedSkills count must equal the user's count of VERIFIED skills in that scope.
   * If any mismatch is found, logs an error and automatically fixes it.
   */
  static async validateConsistency(
    userId?: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<{ valid: boolean; issues: string[]; fixed: number }> {
    const issues: string[] = [];
    let fixed = 0;

    const entries = await tx.leaderboardEntry.findMany({
      where: userId ? { userId } : {},
      include: {
        user: {
          include: {
            skills: {
              where: { status: 'VERIFIED' },
              include: { skillCatalog: true },
            },
          },
        },
      },
    });

    for (const entry of entries) {
      if (!entry.user) {
        const msg = `[Leaderboard Consistency Error] Entry ${entry.id} belongs to non-existent user ${entry.userId}`;
        console.error(msg);
        issues.push(msg);
        await tx.leaderboardEntry.delete({ where: { id: entry.id } });
        fixed++;
        continue;
      }

      let relevantSkills = entry.user.skills;
      if (entry.scope === 'TRACK' && entry.scopeId) {
        relevantSkills = relevantSkills.filter((s) => s.skillCatalog?.trackId === entry.scopeId);
      } else if (entry.scope === 'SKILL' && entry.scopeId) {
        relevantSkills = relevantSkills.filter(
          (s) => s.skillCatalogId === entry.scopeId || s.language.toLowerCase() === entry.scopeId.toLowerCase()
        );
      }

      let parsedSkills: string[] = [];
      try {
        parsedSkills = JSON.parse(entry.verifiedSkills);
      } catch {
        parsedSkills = [];
      }

      // Check 1: User has 0 verified skills in scope but has a leaderboard entry
      if (relevantSkills.length === 0) {
        const msg = `[Leaderboard Consistency Error] User ${entry.user.username} (${entry.userId}) has a LeaderboardEntry for ${entry.scope} (${entry.scopeId || 'GLOBAL'}) but 0 VERIFIED skills. Removing entry.`;
        console.error(msg);
        issues.push(msg);
        await tx.leaderboardEntry.delete({ where: { id: entry.id } });
        fixed++;
        continue;
      }

      // Check 2: Number of verified skills in entry does not match user's actual verified skills count
      if (parsedSkills.length !== relevantSkills.length) {
        const msg = `[Leaderboard Consistency Error] User ${entry.user.username} (${entry.userId}) LeaderboardEntry ${entry.scope} has ${parsedSkills.length} verifiedSkills in entry but ${relevantSkills.length} in DB. Recalculating user.`;
        console.error(msg);
        issues.push(msg);
        await this.recalculateUser(entry.userId, tx);
        fixed++;
      }
    }

    if (fixed > 0) {
      await this.recomputeAllRanks(tx);
    }

    return {
      valid: issues.length === 0,
      issues,
      fixed,
    };
  }

  /**
   * Rebuilds all entries from Skill and Assessment data.
   */
  static async rebuildAll(): Promise<void> {
    console.log('🔄 Rebuilding all LeaderboardEntry records from real database records...');
    await prisma.leaderboardEntry.deleteMany();

    const activeDevelopers = await prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        status: 'ACTIVE',
        profile: { showOnLeaderboard: true },
      },
      select: { id: true },
    });

    console.log(`Processing ${activeDevelopers.length} active developers...`);
    for (const dev of activeDevelopers) {
      await this.recalculateUser(dev.id);
    }
    console.log('✅ Leaderboard successfully rebuilt!');
  }

  /**
   * API: Reads from LeaderboardEntry joined with User (username, avatar).
   * Return: entries [{ rank, username, avatar, verifiedSkills, points, topSkill }], total,
   * and the current user's own entry with rank (even outside the top page).
   * NEVER returns emails!
   */
  static async getLeaderboard(params: {
    scope?: string;
    id?: string;
    period?: string;
    page?: number;
    limit?: number;
    currentUserId?: string;
  }) {
    const rawScope = (params.scope || 'GLOBAL').toUpperCase();
    const scope = (['GLOBAL', 'TRACK', 'SKILL'].includes(rawScope) ? rawScope : 'GLOBAL') as 'GLOBAL' | 'TRACK' | 'SKILL';
    const rawPeriod = (params.period || 'ALL').toUpperCase();
    const period = (['ALL', 'MONTH'].includes(rawPeriod) ? rawPeriod : 'ALL') as 'ALL' | 'MONTH';
    const periodKey = period === 'MONTH' ? getCurrentMonthKey() : 'all';
    const scopeId = scope === 'GLOBAL' ? '' : (params.id || '');
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const currentUserId = params.currentUserId;

    const whereClause: Prisma.LeaderboardEntryWhereInput = {
      scope,
      scopeId,
      period,
      periodKey,
      user: {
        status: 'ACTIVE',
        profile: { showOnLeaderboard: true },
      },
    };

    const total = await prisma.leaderboardEntry.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const dbEntries = await prisma.leaderboardEntry.findMany({
      where: whereClause,
      orderBy: { rank: 'asc' },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            skills: {
              where: { status: 'VERIFIED' },
              orderBy: { bestScore: 'desc' },
              take: 1,
              select: { language: true, claimedLevel: true, bestScore: true },
            },
          },
        },
      },
    });

    const entries = dbEntries.map((e) => {
      let parsedSkills: string[] = [];
      try {
        parsedSkills = JSON.parse(e.verifiedSkills);
      } catch {
        parsedSkills = [];
      }

      const top = e.user.skills[0];
      return {
        rank: e.rank,
        userId: e.user.id,
        username: e.user.username,
        name: e.user.name,
        avatar: undefined,
        verifiedSkills: parsedSkills,
        points: e.points,
        level: top ? top.claimedLevel : 'Basic',
        topSkill: top
          ? {
              language: top.language,
              level: top.claimedLevel,
              score: top.bestScore || 0,
            }
          : null,
        isCurrentUser: currentUserId === e.user.id,
      };
    });

    // Compute current user's entry (even if outside current page)
    let currentUserRank: any = null;
    if (currentUserId) {
      const userEntry = await prisma.leaderboardEntry.findFirst({
        where: {
          ...whereClause,
          userId: currentUserId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              skills: {
                where: { status: 'VERIFIED' },
                orderBy: { bestScore: 'desc' },
                take: 1,
                select: { language: true, claimedLevel: true, bestScore: true },
              },
            },
          },
        },
      });

      if (userEntry) {
        // Find previous rank points to compute difference
        let nextRankPointsDiff = 0;
        if (userEntry.rank > 1) {
          const prevEntry = await prisma.leaderboardEntry.findFirst({
            where: {
              ...whereClause,
              rank: userEntry.rank - 1,
            },
            select: { points: true },
          });
          if (prevEntry) {
            nextRankPointsDiff = Math.max(0, Math.round((prevEntry.points - userEntry.points) * 10) / 10);
          }
        }

        const top = userEntry.user.skills[0];
        currentUserRank = {
          rank: userEntry.rank,
          points: userEntry.points,
          nextRankPointsDiff,
          totalParticipants: total,
          level: top ? top.claimedLevel : 'Basic',
        };
      }
    }

    return {
      entries,
      total,
      page,
      limit,
      totalPages,
      currentUserRank,
    };
  }

  // Backward compatibility method for tests
  static async recalculateLeaderboard(options: any = {}) {
    const scope = (options.scope || 'GLOBAL').toUpperCase() as any;
    const period = (options.period || 'ALL').toUpperCase() as any;
    const scopeId = scope === 'TRACK' ? options.trackId : scope === 'SKILL' ? options.skillId : null;
    const periodKey = period === 'MONTH' ? getCurrentMonthKey() : 'all';

    const devs = await prisma.user.findMany({
      where: { role: 'DEVELOPER', status: 'ACTIVE' },
      select: { id: true },
    });
    for (const d of devs) {
      await this.recalculateUser(d.id);
    }
    const res = await this.getLeaderboard({ scope, id: scopeId, period });
    return res.entries;
  }
}
