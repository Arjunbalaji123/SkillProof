import { prisma } from '../config/db.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import { AssessmentService } from '../services/assessmentService.js';
import { AdminService } from '../services/adminService.js';
import assert from 'assert';

async function verifyRealDatabaseLeaderboard() {
  console.log('🧪 VERIFYING REAL DATABASE LEADERBOARD (No Mocks/In-Memory)...');

  // Step 1: Rebuild from DB records
  console.log('1️⃣ Running npm run leaderboard:rebuild...');
  await LeaderboardService.rebuildAll();

  // Query DB directly
  const totalEntries = await prisma.leaderboardEntry.count();
  console.log(`Total LeaderboardEntry rows in DB: ${totalEntries}`);
  assert(totalEntries > 0, 'LeaderboardEntry rows must exist in database');

  // Confirm LeaderboardEntry matches Skill data
  const arjun = await prisma.user.findUnique({
    where: { username: 'arjun' },
    include: { skills: { where: { status: 'VERIFIED' } } },
  });
  assert(arjun, 'Arjun exists');

  const arjunEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: arjun.id, scope: 'GLOBAL', period: 'ALL' },
  });
  assert(arjunEntry, 'Arjun must have a GLOBAL ALL LeaderboardEntry in DB');
  console.log(`Arjun verified skills count: ${arjun.skills.length}, DB points: ${arjunEntry.points}, rank: #${arjunEntry.rank}`);
  assert(arjunEntry.points > 0, 'Arjun points in DB must be > 0');

  // Step 2: Take a test as a user and confirm points & rank change without restarting
  console.log('\n2️⃣ Taking an assessment and verifying real DB transaction update...');
  const testDev = await prisma.user.findUnique({
    where: { username: 'sarah_code' },
    include: { skills: true },
  });
  assert(testDev, 'testDev (sarah_code) must exist');

  const beforeTestEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: testDev.id, scope: 'GLOBAL', period: 'ALL' },
  });
  const devInitialPoints = beforeTestEntry?.points || 0;
  console.log(`${testDev.username} initial points: ${devInitialPoints}`);

  // Create a new assessment attempt for testDev in JavaScript
  const jsSkillCatalog = await prisma.skillCatalog.findFirst({
    where: { name: 'JavaScript' },
  });
  assert(jsSkillCatalog, 'JavaScript SkillCatalog exists');

  // Claim or get skill
  let testJsSkill = await prisma.skill.findUnique({
    where: { userId_language: { userId: testDev.id, language: 'JavaScript' } },
  });
  if (!testJsSkill) {
    testJsSkill = await prisma.skill.create({
      data: {
        userId: testDev.id,
        skillCatalogId: jsSkillCatalog.id,
        language: 'JavaScript',
        claimedLevel: 'Intermediate',
        status: 'CLAIMED',
      },
    });
  }

  // Clear any past assessment attempts for this user on JavaScript so no cooldown applies
  await prisma.assessmentQuestion.deleteMany({
    where: { assessment: { userId: testDev.id, language: 'JavaScript' } },
  });
  await prisma.assessment.deleteMany({
    where: { userId: testDev.id, language: 'JavaScript' },
  });

  // Start assessment
  const started = await AssessmentService.startAssessment(testDev.id, 'JavaScript');
  assert(started.assessmentId, 'Assessment started');

  // Submit test with answers (submitAssessment calculates score, updates skill, and recalculates leaderboard inside transaction)
  // Answer questions as correct
  const aqs = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: started.assessmentId },
    include: { question: true },
  });
  for (const aq of aqs) {
    let parsedCorrect = null;
    try {
      parsedCorrect = JSON.parse(aq.question.correctAnswer);
    } catch {
      parsedCorrect = [aq.question.correctAnswer];
    }
    await AssessmentService.saveAnswer(testDev.id, started.assessmentId, aq.order, parsedCorrect);
  }

  // Submit assessment
  const result = await AssessmentService.submitAssessment(testDev.id, started.assessmentId);
  console.log(`Assessment submitted: score = ${result.scorePercent}%, level = ${result.level}, passed = ${result.passed}`);

  // Query DB directly for testDev's new entry
  const afterDevEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: testDev.id, scope: 'GLOBAL', period: 'ALL' },
  });
  assert(afterDevEntry, `${testDev.username} must have updated entry in DB`);
  console.log(`${testDev.username} new points: ${afterDevEntry.points}, rank: #${afterDevEntry.rank}`);
  assert(afterDevEntry.points > devInitialPoints, 'Points must have increased from test submission');

  // Step 3: Restart backend simulation (Prisma query without any memory state)
  console.log('\n3️⃣ Verifying persistence across simulated backend restart...');
  // Direct Prisma query without touching any class state
  const directQueryEntries = await prisma.leaderboardEntry.findMany({
    where: { scope: 'GLOBAL', period: 'ALL' },
    orderBy: { rank: 'asc' },
    take: 3,
    include: { user: { select: { username: true } } },
  });
  console.log('Top 3 directly from SQLite database:');
  directQueryEntries.forEach((e) => console.log(`  #${e.rank}: @${e.user.username} (${e.points} pts)`));
  assert(directQueryEntries.length === 3, 'Top 3 exist directly in DB');

  // Step 4: Suspend a user and confirm they disappear from the leaderboard
  console.log(`\n4️⃣ Suspending user ${testDev.username} and verifying removal from leaderboard...`);
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  assert(admin, 'Admin exists');

  await AdminService.updateUserStatus(admin.id, testDev.id, 'SUSPENDED');

  const suspendedDevEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: testDev.id, scope: 'GLOBAL', period: 'ALL' },
  });
  assert(suspendedDevEntry === null, 'Suspended user must NOT have any LeaderboardEntry in database');
  console.log(`✅ ${testDev.username} successfully removed from all LeaderboardEntry records upon suspension`);

  // Confirm API also does not return suspended user
  const lbAfterSuspend = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all' });
  const devInApi = lbAfterSuspend.entries.find((e) => e.username === testDev.username);
  assert(!devInApi, 'Suspended user must not appear in getLeaderboard API response');
  console.log(`✅ Suspended user ${testDev.username} confirmed absent from getLeaderboard API response`);

  // Restore testDev to ACTIVE
  await AdminService.updateUserStatus(admin.id, testDev.id, 'ACTIVE');
  console.log(`✅ ${testDev.username} restored to ACTIVE`);

  console.log('\n🎉 ALL REAL DATABASE LEADERBOARD VERIFICATIONS PASSED!');
}

verifyRealDatabaseLeaderboard()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
