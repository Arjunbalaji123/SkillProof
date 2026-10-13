import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export const PROCTOR_EVENT_TYPES = [
  'PHONE',
  'BOOK',
  'NO_FACE',
  'MULTI_FACE',
  'CAMERA_OFF',
  'NO_HEARTBEAT',
] as const;

export type ProctorEventType = (typeof PROCTOR_EVENT_TYPES)[number];

export const PROCTOR_COOLDOWN_MS = 20 * 1000; // 20 seconds cooldown after last counted event
export const SKILL_LOCKOUT_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days lockout
export const HEARTBEAT_TIMEOUT_MS = 30 * 1000; // 30 seconds without heartbeat
export const SNAPSHOT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

export class ProctorService {
  static getSnapshotDir(): string {
    const dir = path.resolve(process.cwd(), 'uploads/proctor');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Saves a small JPEG snapshot to server/uploads/proctor/ with a random filename.
   */
  static async saveSnapshot(snapshotData?: string | Buffer | null): Promise<string | null> {
    if (!snapshotData) return null;

    try {
      const dir = this.getSnapshotDir();
      let buffer: Buffer;

      if (Buffer.isBuffer(snapshotData)) {
        buffer = snapshotData;
      } else if (typeof snapshotData === 'string') {
        const trimmed = snapshotData.trim();
        if (!trimmed) return null;
        const base64Match = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
        const rawBase64 = base64Match ? base64Match[1] : trimmed;
        buffer = Buffer.from(rawBase64, 'base64');
      } else {
        return null;
      }

      if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
        // Ignore empty or excessively large payloads (>2MB)
        return null;
      }

      const filename = `snap_${crypto.randomBytes(16).toString('hex')}.jpg`;
      const filePath = path.join(dir, filename);
      await fs.promises.writeFile(filePath, buffer);

      return `/uploads/proctor/${filename}`;
    } catch (err) {
      console.error('[ProctorService] Failed to save snapshot:', err);
      return null;
    }
  }

  /**
   * Records a proctor violation event for an assessment.
   * - Ignores events inside a 20-second cooldown after the last counted event (counted = false).
   * - Otherwise counts it (counted = true):
   *   - 1st counted event: warning 1 of 2
   *   - 2nd counted event: final warning (2 of 2)
   *   - 3rd counted event: sets Assessment.status = TERMINATED (no score, no level, no verification),
   *     creates a 2-day SkillLockout, writes an AuditLog entry, and returns status TERMINATED.
   */
  static async recordProctorEvent(
    userId: string,
    assessmentId: string,
    type: ProctorEventType,
    snapshotData?: string | Buffer | null,
    nowOverride?: Date
  ) {
    if (!PROCTOR_EVENT_TYPES.includes(type)) {
      const err: any = new Error(`Invalid proctor event type: ${type}`);
      err.statusCode = 400;
      throw err;
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        skill: true,
        skillLockouts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assessment) {
      const err: any = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    if (assessment.userId !== userId) {
      const err: any = new Error('Unauthorized access to assessment');
      err.statusCode = 403;
      throw err;
    }

    const now = nowOverride ? new Date(nowOverride) : new Date();

    // If already terminated, return current terminated state
    if (assessment.status === 'TERMINATED') {
      const existingLockout = assessment.skillLockouts[0];
      return {
        warningNumber: 3,
        remainingWarnings: 0,
        status: 'TERMINATED',
        counted: false,
        until: existingLockout?.until || null,
        type,
      };
    }

    if (assessment.status !== 'IN_PROGRESS') {
      const err: any = new Error(`Assessment is ${assessment.status} and cannot record proctor events`);
      err.statusCode = 400;
      throw err;
    }

    // Fetch existing counted events for this assessment
    const countedEvents = await prisma.proctorEvent.findMany({
      where: {
        assessmentId,
        counted: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lastCountedEvent = countedEvents[0];
    const isInsideCooldown =
      lastCountedEvent &&
      now.getTime() - new Date(lastCountedEvent.createdAt).getTime() < PROCTOR_COOLDOWN_MS;

    if (isInsideCooldown) {
      // Save uncounted event inside 20-second cooldown
      const uncountedEvent = await prisma.proctorEvent.create({
        data: {
          assessmentId,
          userId,
          type,
          snapshotUrl: null,
          createdAt: now,
          counted: false,
        },
      });

      const currentWarnings = countedEvents.length;
      return {
        eventId: uncountedEvent.id,
        counted: false,
        warningNumber: currentWarnings,
        remainingWarnings: Math.max(0, 2 - currentWarnings),
        status: assessment.status,
        until: null,
        type,
      };
    }

    // Save snapshot only for counted events
    const snapshotUrl = await this.saveSnapshot(snapshotData);

    const warningNumber = countedEvents.length + 1;
    const remainingWarnings = Math.max(0, 2 - warningNumber);

    if (warningNumber >= 3) {
      // 3rd counted violation -> Terminate assessment & create 2-day SkillLockout
      let skillCatalogId = assessment.skillCatalogId || assessment.skill?.skillCatalogId || null;
      if (!skillCatalogId) {
        const catalog = await prisma.skillCatalog.findFirst({
          where: {
            OR: [
              { name: { equals: assessment.language } },
              { slug: { equals: assessment.language.toLowerCase() } },
            ],
          },
        });
        skillCatalogId = catalog?.id || null;
      }

      const until = new Date(now.getTime() + SKILL_LOCKOUT_DURATION_MS);
      const lockoutReason = `Terminated after 3 proctoring violations (final violation: ${type})`;

      const result = await prisma.$transaction(async (tx) => {
        const countedEvent = await tx.proctorEvent.create({
          data: {
            assessmentId,
            userId,
            type,
            snapshotUrl,
            createdAt: now,
            counted: true,
          },
        });

        await tx.assessment.update({
          where: { id: assessmentId },
          data: {
            status: 'TERMINATED',
            submittedAt: now,
            scorePercent: null,
            weightedPercent: null,
            level: null,
            topicBreakdown: null,
            coverage: null,
            confidence: null,
          },
        });

        let lockout = null;
        if (skillCatalogId) {
          lockout = await tx.skillLockout.create({
            data: {
              userId,
              skillCatalogId,
              assessmentId,
              reason: lockoutReason,
              until,
              liftedByAdmin: false,
            },
          });
        }

        return { countedEvent, lockout };
      });

      await logAudit(userId, 'ASSESSMENT_TERMINATED', 'Assessment', assessmentId, {
        language: assessment.language,
        violationType: type,
        warningNumber: 3,
        lockedUntil: until.toISOString(),
        lockoutId: result.lockout?.id,
      });

      if (result.lockout) {
        await logAudit(userId, 'SKILL_LOCKOUT_CREATED', 'SkillLockout', result.lockout.id, {
          skillCatalogId,
          language: assessment.language,
          until: until.toISOString(),
          reason: lockoutReason,
        });
      }

      return {
        eventId: result.countedEvent.id,
        counted: true,
        warningNumber: 3,
        remainingWarnings: 0,
        status: 'TERMINATED',
        until: until.toISOString(),
        lockoutId: result.lockout?.id || null,
        type,
      };
    }

    // 1st or 2nd counted violation -> Warning
    const countedEvent = await prisma.proctorEvent.create({
      data: {
        assessmentId,
        userId,
        type,
        snapshotUrl,
        createdAt: now,
        counted: true,
      },
    });

    await logAudit(userId, `PROCTOR_WARNING_${warningNumber}`, 'Assessment', assessmentId, {
      language: assessment.language,
      violationType: type,
      warningNumber,
      remainingWarnings,
    });

    return {
      eventId: countedEvent.id,
      counted: true,
      warningNumber,
      remainingWarnings,
      status: 'IN_PROGRESS',
      until: null,
      type,
    };
  }

  /**
   * Processes a heartbeat from the client (expected every 10s).
   * If no heartbeat arrived for > 30 seconds during an IN_PROGRESS assessment,
   * records NO_HEARTBEAT as a violation.
   */
  static async recordHeartbeat(
    userId: string,
    assessmentId: string,
    cameraStatus?: string,
    nowOverride?: Date
  ) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        skillLockouts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assessment) {
      const err: any = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    if (assessment.userId !== userId) {
      const err: any = new Error('Unauthorized access to assessment');
      err.statusCode = 403;
      throw err;
    }

    const now = nowOverride ? new Date(nowOverride) : new Date();

    if (assessment.status === 'TERMINATED') {
      return {
        warningNumber: 3,
        remainingWarnings: 0,
        status: 'TERMINATED',
        until: assessment.skillLockouts[0]?.until || null,
        violationTriggered: null,
      };
    }

    if (assessment.status !== 'IN_PROGRESS') {
      return {
        warningNumber: 0,
        remainingWarnings: 2,
        status: assessment.status,
        until: null,
        violationTriggered: null,
      };
    }

    const referenceTime = assessment.lastHeartbeatAt
      ? new Date(assessment.lastHeartbeatAt)
      : new Date(assessment.startedAt);
    const gapMs = now.getTime() - referenceTime.getTime();

    // Update lastHeartbeatAt to now
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { lastHeartbeatAt: now },
    });

    // If > 30 seconds elapsed without a heartbeat, record NO_HEARTBEAT violation
    if (gapMs > HEARTBEAT_TIMEOUT_MS) {
      const violationResult = await this.recordProctorEvent(
        userId,
        assessmentId,
        'NO_HEARTBEAT',
        null,
        now
      );
      return {
        ...violationResult,
        heartbeatGapMs: gapMs,
        cameraStatus: cameraStatus || 'unknown',
        violationTriggered: 'NO_HEARTBEAT',
      };
    }

    const countedEventsCount = await prisma.proctorEvent.count({
      where: {
        assessmentId,
        counted: true,
      },
    });

    return {
      counted: false,
      warningNumber: countedEventsCount,
      remainingWarnings: Math.max(0, 2 - countedEventsCount),
      status: assessment.status,
      until: null,
      heartbeatGapMs: gapMs,
      cameraStatus: cameraStatus || 'ok',
      violationTriggered: null,
    };
  }

  /**
   * Background monitor that checks IN_PROGRESS assessments that have started sending heartbeats
   * and records NO_HEARTBEAT if >30 seconds have passed since lastHeartbeatAt.
   */
  static async monitorActiveHeartbeats(nowOverride?: Date) {
    const now = nowOverride ? new Date(nowOverride) : new Date();
    const threshold = new Date(now.getTime() - HEARTBEAT_TIMEOUT_MS);

    const staleAssessments = await prisma.assessment.findMany({
      where: {
        status: 'IN_PROGRESS',
        lastHeartbeatAt: {
          not: null,
          lt: threshold,
        },
      },
    });

    const results = [];
    for (const assessment of staleAssessments) {
      const elapsedSec = (now.getTime() - new Date(assessment.startedAt).getTime()) / 1000;
      if (elapsedSec > assessment.durationSec) {
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { status: 'EXPIRED' },
        });
        continue;
      }

      // Advance lastHeartbeatAt so we don't re-trigger until another 30s if still stale
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { lastHeartbeatAt: now },
      });

      const res = await this.recordProctorEvent(
        assessment.userId,
        assessment.id,
        'NO_HEARTBEAT',
        null,
        now
      );
      results.push({ assessmentId: assessment.id, ...res });
    }

    return results;
  }

  /**
   * Finds any active SkillLockout for a user and skill.
   */
  static async getActiveLockout(userId: string, skillCatalogId?: string | null, language?: string, nowOverride?: Date) {
    const now = nowOverride ? new Date(nowOverride) : new Date();

    let resolvedCatalogId = skillCatalogId || null;
    if (!resolvedCatalogId && language) {
      const catalog = await prisma.skillCatalog.findFirst({
        where: {
          OR: [
            { name: { equals: language } },
            { slug: { equals: language.toLowerCase() } },
          ],
        },
      });
      resolvedCatalogId = catalog?.id || null;
    }

    if (!resolvedCatalogId) return null;

    return prisma.skillLockout.findFirst({
      where: {
        userId,
        skillCatalogId: resolvedCatalogId,
        liftedByAdmin: false,
        until: { gt: now },
      },
      orderBy: { until: 'desc' },
      include: {
        skillCatalog: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  /**
   * Lists all active (and recent) lockouts for a user so the Assessments page can show "Locked until <date>"
   * and allow submitting appeals.
   */
  static async getUserLockouts(userId: string) {
    const now = new Date();
    return prisma.skillLockout.findMany({
      where: {
        userId,
        liftedByAdmin: false,
        until: { gt: now },
      },
      include: {
        skillCatalog: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { until: 'desc' },
    });
  }

  /**
   * User submits an appeal from a locked skill card.
   */
  static async submitAppeal(userId: string, lockoutId: string, appealText: string) {
    const lockout = await prisma.skillLockout.findUnique({
      where: { id: lockoutId },
      include: {
        skillCatalog: { select: { name: true } },
      },
    });

    if (!lockout) {
      const err: any = new Error('Lockout record not found');
      err.statusCode = 404;
      throw err;
    }

    if (lockout.userId !== userId) {
      const err: any = new Error('Unauthorized to appeal this lockout');
      err.statusCode = 403;
      throw err;
    }

    const updated = await prisma.skillLockout.update({
      where: { id: lockoutId },
      data: {
        appealText: appealText.trim(),
        appealedAt: new Date(),
      },
      include: {
        skillCatalog: { select: { id: true, name: true, slug: true } },
      },
    });

    await logAudit(userId, 'LOCKOUT_APPEAL_SUBMITTED', 'SkillLockout', lockoutId, {
      skillName: lockout.skillCatalog.name,
      appealText: appealText.trim(),
    });

    return updated;
  }

  /**
   * Admin Proctoring Console data:
   * - List of TERMINATED attempts and SkillLockouts with violation events, snapshots, and appeals
   * - List of all violation events
   */
  static async getAdminProctoringData() {
    const [lockouts, terminatedAssessments, recentEvents] = await Promise.all([
      prisma.skillLockout.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true },
          },
          skillCatalog: {
            select: { id: true, name: true, slug: true },
          },
          assessment: {
            select: {
              id: true,
              language: true,
              startedAt: true,
              submittedAt: true,
              status: true,
              tabSwitchCount: true,
              proctorEvents: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      }),
      prisma.assessment.findMany({
        where: { status: 'TERMINATED' },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true },
          },
          proctorEvents: {
            orderBy: { createdAt: 'asc' },
          },
          skillLockouts: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.proctorEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true },
          },
          assessment: {
            select: {
              id: true,
              language: true,
              status: true,
              startedAt: true,
              skillLockouts: {
                select: {
                  id: true,
                  until: true,
                  liftedByAdmin: true,
                  confirmedByAdmin: true,
                  appealText: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      lockouts,
      terminatedAssessments,
      recentEvents,
    };
  }

  /**
   * Admin lifts a skill lockout with a reason.
   * Also gives back the attempt (liftedByAdmin = true excludes that TERMINATED assessment from the 3-attempts-per-30-days limit).
   */
  static async liftLockout(adminId: string, lockoutId: string, reason: string) {
    const lockout = await prisma.skillLockout.findUnique({
      where: { id: lockoutId },
      include: {
        skillCatalog: { select: { name: true } },
        user: { select: { username: true } },
      },
    });

    if (!lockout) {
      const err: any = new Error('Skill lockout not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.skillLockout.update({
      where: { id: lockoutId },
      data: {
        liftedByAdmin: true,
        liftedReason: reason.trim(),
        until: new Date(),
      },
    });

    await logAudit(adminId, 'PROCTOR_LOCKOUT_LIFTED', 'SkillLockout', lockoutId, {
      reason: reason.trim(),
      targetUserId: lockout.userId,
      targetUsername: lockout.user.username,
      skillName: lockout.skillCatalog.name,
      assessmentId: lockout.assessmentId,
      attemptRestored: true,
    });

    return updated;
  }

  /**
   * Admin confirms a violation / lockout.
   */
  static async confirmViolation(adminId: string, lockoutId: string, notes?: string) {
    const lockout = await prisma.skillLockout.findUnique({
      where: { id: lockoutId },
      include: {
        skillCatalog: { select: { name: true } },
        user: { select: { username: true } },
      },
    });

    if (!lockout) {
      const err: any = new Error('Skill lockout not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.skillLockout.update({
      where: { id: lockoutId },
      data: {
        confirmedByAdmin: true,
      },
    });

    await logAudit(adminId, 'PROCTOR_VIOLATION_CONFIRMED', 'SkillLockout', lockoutId, {
      notes: notes || 'Violation confirmed by administrator',
      targetUserId: lockout.userId,
      targetUsername: lockout.user.username,
      skillName: lockout.skillCatalog.name,
      assessmentId: lockout.assessmentId,
    });

    return updated;
  }

  /**
   * Cleanup job: Deletes proctor snapshots older than 30 days.
   */
  static async cleanupExpiredSnapshots(nowOverride?: Date) {
    const now = nowOverride ? new Date(nowOverride) : new Date();
    const cutoff = new Date(now.getTime() - SNAPSHOT_RETENTION_MS);
    const dir = this.getSnapshotDir();

    let deletedCount = 0;

    // 1. Clean up DB references and files for ProctorEvents older than 30 days
    const expiredEvents = await prisma.proctorEvent.findMany({
      where: {
        snapshotUrl: { not: null },
        createdAt: { lt: cutoff },
      },
    });

    for (const ev of expiredEvents) {
      if (ev.snapshotUrl) {
        const filename = path.basename(ev.snapshotUrl);
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
          try {
            await fs.promises.unlink(filePath);
            deletedCount++;
          } catch (_) {
            // ignore unlink errors
          }
        }
      }
      await prisma.proctorEvent.update({
        where: { id: ev.id },
        data: { snapshotUrl: null },
      });
    }

    // 2. Also scan directory for any orphan files older than 30 days
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.jpg') && !file.endsWith('.jpeg') && !file.endsWith('.png')) continue;
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        if (stat.mtime.getTime() < cutoff.getTime()) {
          await fs.promises.unlink(fullPath);
          deletedCount++;
        }
      }
    } catch (_) {
      // ignore directory scan errors
    }

    return { deletedCount, cutoff };
  }
}

