import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { AuthService } from '../services/authService.js';
import { AssessmentService } from '../services/assessmentService.js';
import { ProctorService } from '../services/proctorService.js';
import { ScoringService } from '../services/scoringService.js';

export async function runProctoringTests() {
  console.log('🧪 Running Camera Proctoring & Lockout Unit Tests...');
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${name}: ${err.message}`);
      failed++;
    }
  };

  const uniqueSuffix = Date.now().toString(36);
  const reg = await AuthService.register({
    name: `Proctor Test User ${uniqueSuffix}`,
    username: `proctor_${uniqueSuffix}`.slice(0, 20),
    email: `proctor_${uniqueSuffix}@test.dev`,
    password: 'Password@123',
    role: 'DEVELOPER',
  });
  const userId = reg.user.id;

  const admin = await prisma.user.findUnique({ where: { email: 'admin@skillproof.dev' } });
  const adminId = admin!.id;

  let jsAssessmentId = '';
  let jsLockoutId = '';
  let savedSnapshotFilename = '';

  try {
    // 1. Violation counting & 20-second cooldown
    await test('ProctorService: 1st/2nd/3rd event counting and 20-second cooldown', async () => {
      const started = await AssessmentService.startAssessment(userId, 'JavaScript');
      jsAssessmentId = started.assessmentId;

      const t0 = new Date();
      // Small 1x1 JPEG base64
      const tinyJpegBase64 =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      // 1st counted event (PHONE at t0)
      const ev1 = await ProctorService.recordProctorEvent(
        userId,
        jsAssessmentId,
        'PHONE',
        tinyJpegBase64,
        t0
      );
      assert.strictEqual(ev1.counted, true, '1st event should be counted');
      assert.strictEqual(ev1.warningNumber, 1);
      assert.strictEqual(ev1.remainingWarnings, 1);
      assert.strictEqual(ev1.status, 'IN_PROGRESS');

      const dbEv1 = await prisma.proctorEvent.findUnique({ where: { id: ev1.eventId } });
      assert(dbEv1?.snapshotUrl?.startsWith('/uploads/proctor/snap_'), 'Snapshot URL saved');
      savedSnapshotFilename = path.basename(dbEv1!.snapshotUrl!);
      const fullSnapPath = path.join(ProctorService.getSnapshotDir(), savedSnapshotFilename);
      assert(fs.existsSync(fullSnapPath), 'Snapshot file exists in server/uploads/proctor/');

      // Event inside 20s cooldown (+10s) -> ignored (counted = false)
      const t10 = new Date(t0.getTime() + 10 * 1000);
      const evCooldown1 = await ProctorService.recordProctorEvent(
        userId,
        jsAssessmentId,
        'BOOK',
        tinyJpegBase64,
        t10
      );
      assert.strictEqual(evCooldown1.counted, false, 'Event inside 20s cooldown must have counted=false');
      assert.strictEqual(evCooldown1.warningNumber, 1);
      assert.strictEqual(evCooldown1.remainingWarnings, 1);
      assert.strictEqual(evCooldown1.status, 'IN_PROGRESS');

      // 2nd counted event after 20s cooldown (+25s) -> Final warning (2 of 2)
      const t25 = new Date(t0.getTime() + 25 * 1000);
      const ev2 = await ProctorService.recordProctorEvent(
        userId,
        jsAssessmentId,
        'NO_FACE',
        tinyJpegBase64,
        t25
      );
      assert.strictEqual(ev2.counted, true, '2nd event after 20s cooldown must be counted');
      assert.strictEqual(ev2.warningNumber, 2);
      assert.strictEqual(ev2.remainingWarnings, 0);
      assert.strictEqual(ev2.status, 'IN_PROGRESS');

      // Event inside 20s cooldown after 2nd warning (+35s) -> ignored
      const t35 = new Date(t0.getTime() + 35 * 1000);
      const evCooldown2 = await ProctorService.recordProctorEvent(
        userId,
        jsAssessmentId,
        'MULTI_FACE',
        null,
        t35
      );
      assert.strictEqual(evCooldown2.counted, false);
      assert.strictEqual(evCooldown2.warningNumber, 2);
      assert.strictEqual(evCooldown2.remainingWarnings, 0);
      assert.strictEqual(evCooldown2.status, 'IN_PROGRESS');

      // 3rd counted event after 20s cooldown (+50s) -> TERMINATED & 2-day SkillLockout
      const t50 = new Date(t0.getTime() + 50 * 1000);
      const ev3 = await ProctorService.recordProctorEvent(
        userId,
        jsAssessmentId,
        'CAMERA_OFF',
        tinyJpegBase64,
        t50
      );
      assert.strictEqual(ev3.counted, true, '3rd event must be counted');
      assert.strictEqual(ev3.warningNumber, 3);
      assert.strictEqual(ev3.remainingWarnings, 0);
      assert.strictEqual(ev3.status, 'TERMINATED');
      assert(ev3.until, 'Lockout until date returned');
      jsLockoutId = ev3.lockoutId!;
    });

    // 2. Verify TERMINATED state (no score, no level, no verification, 2-day lockout created)
    await test('ProctorService: 3rd strike sets TERMINATED, no score/level/verification, and creates 2-day SkillLockout', async () => {
      const dbAssessment = await prisma.assessment.findUnique({
        where: { id: jsAssessmentId },
        include: { skill: true, skillLockouts: true },
      });
      assert.strictEqual(dbAssessment?.status, 'TERMINATED');
      assert.strictEqual(dbAssessment?.scorePercent, null);
      assert.strictEqual(dbAssessment?.weightedPercent, null);
      assert.strictEqual(dbAssessment?.level, null);
      assert.strictEqual(dbAssessment?.skill.status, 'CLAIMED');
      assert.strictEqual(dbAssessment?.skillLockouts.length, 1);

      const lockout = dbAssessment!.skillLockouts[0];
      assert.strictEqual(lockout.liftedByAdmin, false);
      const diffHours = (new Date(lockout.until).getTime() - Date.now()) / (1000 * 60 * 60);
      assert(diffHours > 47 && diffHours <= 48.1, 'Lockout duration is 2 days (48 hours)');

      // Submitting a TERMINATED assessment must fail
      let submitFailed = false;
      try {
        await AssessmentService.submitAssessment(userId, jsAssessmentId);
      } catch {
        submitFailed = true;
      }
      assert.strictEqual(submitFailed, true, 'Cannot submit a TERMINATED assessment');
    });

    // 3. Start rejection during active SkillLockout + other skills still start
    await test('AssessmentService: Rejects starting locked skill with unlock date while allowing other skills', async () => {
      let rejected = false;
      let errObj: any = null;
      try {
        await AssessmentService.startAssessment(userId, 'JavaScript');
      } catch (err: any) {
        rejected = true;
        errObj = err;
      }
      assert.strictEqual(rejected, true, 'Start must reject while SkillLockout is active');
      assert(
        errObj.message.includes('locked') || errObj.message.includes('proctoring'),
        `Clear lockout rejection message: ${errObj.message}`
      );
      assert(errObj.nextAvailableDate, 'Unlock date returned on rejection');

      // Other skills (e.g. Python) must still start normally!
      const pythonStart = await AssessmentService.startAssessment(userId, 'Python');
      assert(pythonStart.assessmentId, 'Other skills still start normally while JavaScript is locked');

      // Test heartbeat >30s violation on the Python assessment
      const tBeat1 = new Date();
      const hb1 = await ProctorService.recordHeartbeat(userId, pythonStart.assessmentId, 'ok', tBeat1);
      assert.strictEqual(hb1.violationTriggered, null);
      assert.strictEqual(hb1.warningNumber, 0);

      // 35 seconds later (>30s gap) -> records NO_HEARTBEAT violation
      const tBeat2 = new Date(tBeat1.getTime() + 35 * 1000);
      const hb2 = await ProctorService.recordHeartbeat(userId, pythonStart.assessmentId, 'ok', tBeat2);
      assert.strictEqual(hb2.violationTriggered, 'NO_HEARTBEAT');
      assert.strictEqual(hb2.warningNumber, 1);
      assert.strictEqual(hb2.remainingWarnings, 1);
    });

    // 4. Retake Eligibility: Longer restriction wins & TERMINATED counts toward 3 attempts per 30 days
    await test('ScoringService: Longer restriction wins and TERMINATED attempts count toward 3-per-30-days limit', () => {
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 6 days left on 7-day cooldown

      // Case A: 2-day lockout vs 6-day remaining cooldown -> 6-day cooldown is longer and wins
      const resA = ScoringService.evaluateRetakeEligibility(
        [{ startedAt: oneDayAgo, submittedAt: oneDayAgo, status: 'SUBMITTED' }],
        twoDaysLater,
        now
      );
      assert.strictEqual(resA.eligible, false);
      assert(
        resA.nextAvailableDate!.getTime() > twoDaysLater.getTime(),
        'Longer 7-day cooldown wins over 2-day lockout'
      );

      // Case B: 3 TERMINATED attempts in 30 days (not lifted) blocks starting for 30 days
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const resB = ScoringService.evaluateRetakeEligibility(
        [
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: false },
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: false },
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: false },
        ],
        null,
        now
      );
      assert.strictEqual(resB.eligible, false, '3 non-lifted TERMINATED attempts block retake');

      // Case C: If 1 of the 3 TERMINATED attempts had its lockout lifted by admin, attempt is given back!
      const resC = ScoringService.evaluateRetakeEligibility(
        [
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: true },
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: false },
          { startedAt: tenDaysAgo, submittedAt: tenDaysAgo, status: 'TERMINATED', liftedByAdmin: false },
        ],
        null,
        now
      );
      assert.strictEqual(resC.eligible, true, 'Lifted lockout gives back the attempt');
    });

    // 5. Appeal submission, Admin Confirm Violation & Lift Lockout, and 30-day Snapshot Cleanup
    await test('Admin & Appeals: Appeal submission, Confirm violation, Lift lockout restores attempt, and 30-day cleanup', async () => {
      // Candidate submits appeal
      const appealed = await ProctorService.submitAppeal(
        userId,
        jsLockoutId,
        'Accidental phone notification on desk, immediately removed.'
      );
      assert.strictEqual(
        appealed.appealText,
        'Accidental phone notification on desk, immediately removed.'
      );

      // Admin views proctoring console data (and verify no email/passwordHash leakage)
      const adminData = await ProctorService.getAdminProctoringData();
      const serialized = JSON.stringify(adminData);
      assert(!serialized.includes('passwordHash'), 'No passwordHash in admin proctoring response');
      assert(!serialized.includes('proctor_' + uniqueSuffix + '@test.dev'), 'No email in admin proctoring response');

      // Admin confirms violation (audit logged)
      const confirmed = await ProctorService.confirmViolation(adminId, jsLockoutId, 'Reviewed snapshot');
      assert.strictEqual(confirmed.confirmedByAdmin, true);

      // Admin lifts lockout with reason -> unlocks skill and gives back attempt
      const lifted = await ProctorService.liftLockout(
        adminId,
        jsLockoutId,
        'Granted one-time appeal after review'
      );
      assert.strictEqual(lifted.liftedByAdmin, true);
      assert.strictEqual(lifted.liftedReason, 'Granted one-time appeal after review');

      // Candidate can now start JavaScript assessment again immediately
      const restarted = await AssessmentService.startAssessment(userId, 'JavaScript');
      assert(restarted.assessmentId, 'Skill starts immediately after admin lifts lockout');

      // 30-day snapshot cleanup deletes snapshots older than 30 days
      const future31Days = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
      const cleanupRes = await ProctorService.cleanupExpiredSnapshots(future31Days);
      assert(cleanupRes.deletedCount >= 1, 'Expired proctor snapshots deleted after 30 days');
      const fullSnapPath = path.join(ProctorService.getSnapshotDir(), savedSnapshotFilename);
      assert(!fs.existsSync(fullSnapPath), 'Snapshot file removed from disk after 30 days');
    });
  } finally {
    // Cleanup test user
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }

  console.log(`\n========================================`);
  console.log(`Proctoring Tests Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} proctoring unit tests failed`);
  }
}

