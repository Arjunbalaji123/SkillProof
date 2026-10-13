process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/db.js';
import { LeaderboardService, LEVEL_MULTIPLIERS } from '../services/leaderboardService.js';
import { UserService } from '../services/userService.js';

export async function runLeaderboardUnitTests() {
  console.log('🧪 Running Leaderboard & Points Unit Tests...');
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

  // Test 1: Level multipliers mapping
  await test('Level Multipliers are exactly Basic 1.0, Intermediate 1.5, Advanced 2.0, Expert 3.0', () => {
    assert.strictEqual(LEVEL_MULTIPLIERS['Basic'], 1.0);
    assert.strictEqual(LEVEL_MULTIPLIERS['Intermediate'], 1.5);
    assert.strictEqual(LEVEL_MULTIPLIERS['Advanced'], 2.0);
    assert.strictEqual(LEVEL_MULTIPLIERS['Expert'], 3.0);
  });

  // Test 2: Calculate points for test user
  await test('Points formula: bestScore * multiplier + extra verified bonus (+25) + weekly (+5)', async () => {
    const arjun = await prisma.user.findUnique({
      where: { username: 'arjun' },
      include: { skills: { where: { status: 'VERIFIED' } } },
    });
    assert(arjun, 'Arjun must exist');
    const verifiedCount = arjun.skills.length;

    const breakdown = await LeaderboardService.calculateUserPoints(arjun.id);
    assert(breakdown, 'Breakdown must not be null');
    assert(breakdown.points > 450, `Expected points > 450, got ${breakdown.points}`);
    assert.strictEqual(
      breakdown.extraSkillsBonus,
      (verifiedCount - 1) * 25,
      `Expected extra skill bonus of ${(verifiedCount - 1) * 25} for ${verifiedCount} verified skills`
    );
    assert.strictEqual(breakdown.verifiedSkills.length, verifiedCount);
  });

  // Test 3: Integrity exclusion: high tabSwitchCount (>= 3) is excluded
  await test('Integrity exclusion: attempts with tabSwitchCount >= 3 are ignored', async () => {
    // Create temporary user with an assessment that has tabSwitchCount = 4
    const testDev = await prisma.user.create({
      data: {
        name: 'Cheater Test',
        username: 'cheater_test_' + Date.now().toString(36),
        email: `cheater_${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'DEVELOPER',
        profile: {
          create: {
            showOnLeaderboard: true,
          },
        },
      },
    });

    const skill = await prisma.skill.create({
      data: {
        userId: testDev.id,
        language: 'Rust',
        claimedLevel: 'Expert',
        bestScore: 90,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Create an assessment with tabSwitchCount = 4
    await prisma.assessment.create({
      data: {
        userId: testDev.id,
        skillId: skill.id,
        language: 'Rust',
        status: 'SUBMITTED',
        scorePercent: 90,
        weightedPercent: 90,
        tabSwitchCount: 4, // HIGH TAB SWITCH COUNT!
        submittedAt: new Date(),
      },
    });

    const breakdown = await LeaderboardService.calculateUserPoints(testDev.id);
    assert(breakdown, 'Breakdown must exist');
    // Because the assessment had tabSwitchCount = 4, weekly bonus from this assessment must be 0!
    assert.strictEqual(breakdown.weeklyBonus, 0, 'Assessment with tabSwitchCount >= 3 must NOT contribute to weekly bonus');

    // Clean up
    await prisma.assessment.deleteMany({ where: { userId: testDev.id } });
    await prisma.skill.deleteMany({ where: { userId: testDev.id } });
    await prisma.developerProfile.deleteMany({ where: { userId: testDev.id } });
    await prisma.user.delete({ where: { id: testDev.id } });
  });

  // Test 4: showOnLeaderboard = false exclusion
  await test('showOnLeaderboard = false excludes developer entirely', async () => {
    const hiddenDev = await prisma.user.create({
      data: {
        name: 'Hidden Dev',
        username: 'hidden_dev_' + Date.now().toString(36),
        email: `hidden_${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'DEVELOPER',
        profile: {
          create: {
            showOnLeaderboard: false, // HIDDEN!
          },
        },
      },
    });

    const breakdown = await LeaderboardService.calculateUserPoints(hiddenDev.id);
    assert.strictEqual(breakdown, null, 'User with showOnLeaderboard=false must return null');

    // Clean up
    await prisma.developerProfile.deleteMany({ where: { userId: hiddenDev.id } });
    await prisma.user.delete({ where: { id: hiddenDev.id } });
  });

  // Test 5: Tie-breaking: earlier verifiedAt wins
  await test('Tie-breaking: Earlier verifiedAt ranks higher when points are equal', async () => {
    // Clean any leftover SkillTie records
    await prisma.skill.deleteMany({ where: { language: 'SkillTie' } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'dev_early_' } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'dev_late_' } } });

    const timeA = new Date('2026-01-01T10:00:00Z');
    const timeB = new Date('2026-01-05T10:00:00Z');

    let devAId = '';
    let devBId = '';

    try {
      const devA = await prisma.user.create({
        data: {
          name: 'Dev Early',
          username: 'dev_early_' + Date.now().toString(36),
          email: `early_${Date.now()}@test.com`,
          passwordHash: 'dummy',
          role: 'DEVELOPER',
          profile: { create: { showOnLeaderboard: true } },
        },
      });
      devAId = devA.id;

      const devB = await prisma.user.create({
        data: {
          name: 'Dev Late',
          username: 'dev_late_' + Date.now().toString(36),
          email: `late_${Date.now()}@test.com`,
          passwordHash: 'dummy',
          role: 'DEVELOPER',
          profile: { create: { showOnLeaderboard: true } },
        },
      });
      devBId = devB.id;

      // Both get exactly 80 points on Basic (80 * 1.0 = 80 points)
      await prisma.skill.create({
        data: {
          userId: devA.id,
          language: 'SkillTie',
          claimedLevel: 'Basic',
          bestScore: 80,
          status: 'VERIFIED',
          verifiedAt: timeA, // Earlier!
        },
      });

      await prisma.skill.create({
        data: {
          userId: devB.id,
          language: 'SkillTie',
          claimedLevel: 'Basic',
          bestScore: 80,
          status: 'VERIFIED',
          verifiedAt: timeB, // Later!
        },
      });

      const entries = await LeaderboardService.recalculateLeaderboard({ scope: 'skill', skillId: 'SkillTie' });
      assert.strictEqual(entries.length, 2, 'Should only have 2 entries for SkillTie');
      assert.strictEqual(entries[0].userId, devA.id, 'Earlier verifiedAt (Dev Early) must rank #1');
      assert.strictEqual(entries[1].userId, devB.id, 'Later verifiedAt (Dev Late) must rank #2');
    } finally {
      if (devAId || devBId) {
        await prisma.leaderboardEntry.deleteMany({ where: { userId: { in: [devAId, devBId] } } });
        await prisma.skill.deleteMany({ where: { userId: { in: [devAId, devBId] } } });
        await prisma.developerProfile.deleteMany({ where: { userId: { in: [devAId, devBId] } } });
        await prisma.user.deleteMany({ where: { id: { in: [devAId, devBId] } } });
      }
    }
  });

  // Test 6: Username availability and search
  await test('UserService: check-username validates regex and detects taken usernames', async () => {
    // Taken username
    const takenRes = await UserService.checkUsername('arjun');
    assert.strictEqual(takenRes.available, false);
    assert.strictEqual(takenRes.message, 'Username is already taken.');

    // Available username
    const availRes = await UserService.checkUsername('unique_coder_99');
    assert.strictEqual(availRes.available, true);

    // Invalid format
    const invalidShort = await UserService.checkUsername('ab');
    assert.strictEqual(invalidShort.available, false);

    const invalidChars = await UserService.checkUsername('bad-user!');
    assert.strictEqual(invalidChars.available, false);
  });

  // Test 7: User search never returns emails
  await test('UserService: search returns name, username, points, top skill and NEVER returns emails', async () => {
    const results = await UserService.searchUsers('arjun');
    assert(results.length > 0, 'Should find at least 1 user');
    const u = results.find((r) => r.username === 'arjun') || results[0];
    assert(u.username);
    assert(u.name);
    assert(u.points > 0 || u.points === 0);
    assert(!('email' in u), 'Email must NEVER be returned in search results');
    assert(!('passwordHash' in u), 'passwordHash must NEVER be returned');
  });

  // Test 8: Safety Net: Consistency check verifies verifiedSkills and auto-fixes mismatches
  await test('Safety Net: validateConsistency detects and auto-fixes discrepancies between Skill and LeaderboardEntry', async () => {
    // 1. In clean database, consistency check should be 100% valid
    const initialCheck = await LeaderboardService.validateConsistency();
    assert.strictEqual(initialCheck.valid, true, 'Initial consistency check should pass with 0 issues');
    assert.strictEqual(initialCheck.issues.length, 0);

    // 2. Deliberately tamper with one user's entry (e.g. arjun, make entry claim only 1 skill)
    const arjun = await prisma.user.findUnique({
      where: { username: 'arjun' },
      include: { skills: { where: { status: 'VERIFIED' } } },
    });
    assert(arjun, 'Arjun user must exist');
    const verifiedCount = arjun.skills.length;

    const entry = await prisma.leaderboardEntry.findFirst({
      where: { userId: arjun.id, scope: 'GLOBAL', period: 'ALL' },
    });
    assert(entry, 'Global entry for arjun must exist');

    // Tamper: corrupt verifiedSkills count
    await prisma.leaderboardEntry.update({
      where: { id: entry.id },
      data: { verifiedSkills: JSON.stringify(['JavaScript']) }, // Tampered: 1 skill instead of actual count
    });

    // 3. Run consistency check: should detect and auto-heal
    const tamperedCheck = await LeaderboardService.validateConsistency(arjun.id);
    assert.strictEqual(tamperedCheck.valid, false, 'Tampered entry must be flagged as invalid');
    assert(tamperedCheck.issues.length > 0, 'Issues list must not be empty');
    assert.strictEqual(tamperedCheck.fixed, 1, 'Exactly 1 entry should be auto-fixed');

    // 4. Verify post-healing consistency
    const healedCheck = await LeaderboardService.validateConsistency(arjun.id);
    assert.strictEqual(healedCheck.valid, true, 'Entry must be healthy after self-healing');
    const healedEntry = await prisma.leaderboardEntry.findUnique({ where: { id: entry.id } });
    const parsedSkills = JSON.parse(healedEntry!.verifiedSkills);
    assert.strictEqual(parsedSkills.length, verifiedCount, `Healed entry must accurately reflect ${verifiedCount} verified skills`);
  });

  console.log(`\n========================================`);
  console.log(`Leaderboard Tests Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

if (process.argv[1]?.includes('leaderboardUnitTests')) {
  runLeaderboardUnitTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
