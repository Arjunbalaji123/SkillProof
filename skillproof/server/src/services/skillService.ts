import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export class SkillService {
  /**
   * Retrieves all skills for a user, labeling status clearly as CLAIMED or VERIFIED.
   */
  static async getUserSkills(userId: string) {
    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assessments: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            weightedPercent: true,
            level: true,
          },
        },
      },
    });

    return skills.map((skill) => ({
      id: skill.id,
      language: skill.language,
      claimedLevel: skill.claimedLevel,
      certificateUrl: skill.certificateUrl,
      status: skill.status, // CLAIMED | VERIFIED
      bestScore: skill.bestScore,
      verifiedAt: skill.verifiedAt,
      expiresAt: skill.expiresAt,
      latestAssessment: skill.assessments[0] || null,
      createdAt: skill.createdAt,
    }));
  }

  /**
   * Retrieves dashboard summary for a user as single source of truth:
   * - verifiedCount: skills with status VERIFIED
   * - claimedCount: skills with status CLAIMED
   * - averageVerifiedScore: mean of bestScore across VERIFIED skills
   * - projectCount
   * - skills: [{ language, status, claimedLevel, bestScore, level, verifiedAt }]
   * - recentAttempts: last 5 SUBMITTED assessments with language, scorePercent, weightedPercent, level, submittedAt
   */
  static async getDashboardSummary(userId: string) {
    const [skillsRaw, projectsCount, recentAttemptsRaw] = await Promise.all([
      prisma.skill.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          assessments: {
            where: { status: 'SUBMITTED' },
            orderBy: { submittedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              startedAt: true,
              submittedAt: true,
              scorePercent: true,
              weightedPercent: true,
              level: true,
            },
          },
        },
      }),
      prisma.project.count({
        where: { userId },
      }),
      prisma.assessment.findMany({
        where: {
          userId,
          status: 'SUBMITTED',
        },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          language: true,
          scorePercent: true,
          weightedPercent: true,
          level: true,
          submittedAt: true,
          startedAt: true,
          status: true,
          tabSwitchCount: true,
        },
      }),
    ]);

    const skills = skillsRaw.map((s) => {
      const latestSub = s.assessments[0];
      return {
        id: s.id,
        language: s.language,
        status: s.status, // CLAIMED | VERIFIED
        claimedLevel: s.claimedLevel,
        certificateUrl: s.certificateUrl,
        bestScore: s.bestScore,
        level: latestSub?.level || (s.bestScore ? (s.bestScore >= 90 ? 'Expert' : s.bestScore >= 75 ? 'Advanced' : s.bestScore >= 60 ? 'Intermediate' : s.bestScore >= 40 ? 'Basic' : 'Beginner') : null),
        verifiedAt: s.verifiedAt,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      };
    });

    const verifiedSkills = skills.filter((s) => s.status === 'VERIFIED');
    const claimedSkills = skills.filter((s) => s.status === 'CLAIMED');

    const verifiedCount = verifiedSkills.length;
    const claimedCount = claimedSkills.length;

    const averageVerifiedScore = verifiedCount > 0
      ? Math.round(verifiedSkills.reduce((acc, s) => acc + (s.bestScore || 0), 0) / verifiedCount)
      : 0;

    return {
      verifiedCount,
      claimedCount,
      averageVerifiedScore,
      projectCount: projectsCount,
      skills,
      recentAttempts: recentAttemptsRaw,
    };
  }

  /**
   * Adds or claims a skill. Status is ALWAYS initialized as 'CLAIMED' even with a certificate URL.
   */
  static async claimSkill(userId: string, data: { language: string; claimedLevel?: string; certificateUrl?: string }) {
    const existing = await prisma.skill.findUnique({
      where: {
        userId_language: {
          userId,
          language: data.language,
        },
      },
    });

    if (existing) {
      throw new Error(`Skill for ${data.language} is already added in your profile.`);
    }

    const skill = await prisma.skill.create({
      data: {
        userId,
        language: data.language,
        claimedLevel: data.claimedLevel || 'Intermediate',
        certificateUrl: data.certificateUrl || null,
        status: 'CLAIMED', // Core rule: Certificate is only a claim
      },
    });

    await logAudit(userId, 'SKILL_CLAIMED', 'Skill', skill.id, {
      language: skill.language,
      certificateUrl: skill.certificateUrl,
    });

    return skill;
  }

  /**
   * Updates claimed skill details (e.g. certificate URL or claimed level).
   * Note: Cannot set status to VERIFIED via this route; verification requires passing assessment.
   */
  static async updateClaimedSkill(userId: string, skillId: string, data: { claimedLevel?: string; certificateUrl?: string }) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || skill.userId !== userId) {
      throw new Error('Skill not found or unauthorized');
    }

    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: {
        claimedLevel: data.claimedLevel ?? skill.claimedLevel,
        certificateUrl: data.certificateUrl !== undefined ? data.certificateUrl : skill.certificateUrl,
      },
    });

    await logAudit(userId, 'SKILL_UPDATED', 'Skill', skillId, data);
    return updated;
  }

  /**
   * Deletes a skill.
   */
  static async deleteSkill(userId: string, skillId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || skill.userId !== userId) {
      throw new Error('Skill not found or unauthorized');
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    await logAudit(userId, 'SKILL_DELETED', 'Skill', skillId, { language: skill.language });
    return { success: true };
  }

  /**
   * Admin / Certificate Claims view:
   * Lists all skills with certificateUrls that are still marked CLAIMED (unverified claims).
   */
  static async getCertificateClaims() {
    return prisma.skill.findMany({
      where: {
        certificateUrl: { not: null },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

