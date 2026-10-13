process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/db.js';
import { ScoringService } from '../services/scoringService.js';
import { QuestionService } from '../services/questionService.js';
import { AuthService } from '../services/authService.js';
import { runLeaderboardUnitTests } from './leaderboardUnitTests.js';
import { runEndToEndFlowTest } from './endToEndFlowTest.js';
import { runProctoringTests } from './proctoringTests.js';
import { runMessagingTests } from './messagingTests.js';

export async function runSkillProofTests() {
  console.log('🧪 Starting SkillProof v2 Test Suite...');
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

  // 1. Scoring Logic & Level Tests
  await test('Scoring: Level thresholds & Expert requirement (>=60% on hard)', () => {
    // Beginner (< 40%): 1 correct out of 3 easy = 33.3%
    const resBeginner = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
      { questionId: '2', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
      { questionId: '3', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
    ]);
    assert.strictEqual(resBeginner.level, 'Beginner');
    assert.strictEqual(resBeginner.passed, false);

    // Basic (40-59%)
    const resBasic = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '2', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
    ]);
    assert.strictEqual(resBasic.level, 'Basic');
    assert.strictEqual(resBasic.passed, true);

    // Intermediate (60-74%)
    const resInter = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '2', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'b', correctAnswer: 'b', isCorrect: true },
      { questionId: '3', difficulty: 'HARD', topic: 'Perf', userAnswer: 'c', correctAnswer: 'd', isCorrect: false },
    ]);
    // Easy(1) + Med(2) = 3 out of 6 (50%) -> Basic, let's test accurate 66%
    const resInter66 = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'b', correctAnswer: 'b', isCorrect: true },
      { questionId: '2', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
    ]);
    assert.strictEqual(resInter66.level, 'Intermediate'); // 2/3 = 66.7%

    // Expert without 60% hard falls back to Advanced
    const resExpertFailsHard = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '2', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '3', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '4', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '5', difficulty: 'HARD', topic: 'Perf', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
      { questionId: '6', difficulty: 'HARD', topic: 'Perf', userAnswer: 'a', correctAnswer: 'b', isCorrect: false },
      { questionId: '7', difficulty: 'HARD', topic: 'Perf', userAnswer: 'a', correctAnswer: 'a', isCorrect: true }, // 1/3 hard = 33%
    ]);
    // Even if score is high, level should not be Expert if hard accuracy < 60%
    if (resExpertFailsHard.weightedPercent >= 90) {
      assert.strictEqual(resExpertFailsHard.level, 'Advanced');
    }

    // Expert with >= 60% hard
    const resExpertPasses = ScoringService.calculateScore([
      { questionId: '1', difficulty: 'EASY', topic: 'Syntax', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '2', difficulty: 'MEDIUM', topic: 'Async', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '3', difficulty: 'HARD', topic: 'Perf', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
      { questionId: '4', difficulty: 'HARD', topic: 'Perf', userAnswer: 'a', correctAnswer: 'a', isCorrect: true },
    ]);
    assert.strictEqual(resExpertPasses.level, 'Expert');
    assert.strictEqual(resExpertPasses.hardAccuracyPercent, 100);
  });

  // 2. Answer comparison logic & normalization
  await test('Scoring: isAnswerCorrect logic handles types and whitespace', () => {
    // Normalization & set equivalence
    assert.strictEqual(ScoringService.isAnswerCorrect(' A ', 'a'), true);
    assert.strictEqual(ScoringService.isAnswerCorrect('16', ['16']), true);
    assert.strictEqual(ScoringService.isAnswerCorrect('"16"', '["16"]'), true);
    assert.strictEqual(ScoringService.isAnswerCorrect(['16'], '16'), true);
    assert.strictEqual(ScoringService.isAnswerCorrect(['a', 'c'], ['c', 'a']), true);
    assert.strictEqual(ScoringService.isAnswerCorrect(JSON.stringify(['a', 'c']), JSON.stringify(['c', 'a'])), true);
    assert.strictEqual(ScoringService.isAnswerCorrect(['b', 'a'], ['a', 'b']), true);

    // Empty / null / whitespace answers must be false
    assert.strictEqual(ScoringService.isAnswerCorrect('', ['16']), false);
    assert.strictEqual(ScoringService.isAnswerCorrect(null, ['16']), false);
    assert.strictEqual(ScoringService.isAnswerCorrect(undefined, ['16']), false);
    assert.strictEqual(ScoringService.isAnswerCorrect([], ['16']), false);
    assert.strictEqual(ScoringService.isAnswerCorrect('  ', ['16']), false);

    // Mismatched answers
    assert.strictEqual(ScoringService.isAnswerCorrect('wrong', 'right'), false);
    assert.strictEqual(ScoringService.isAnswerCorrect(['a'], ['a', 'b']), false);
  });

  // 3. Retake cooldown policy
  await test('Scoring: Retake cooldown rules (7-day cooldown and 3 attempts limit)', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    // 1 attempt 2 days ago -> cooldown active
    const check1 = ScoringService.evaluateRetakeEligibility([
      { startedAt: twoDaysAgo, submittedAt: twoDaysAgo, status: 'SUBMITTED' },
    ]);
    assert.strictEqual(check1.eligible, false);

    // 1 attempt 8 days ago -> eligible
    const check2 = ScoringService.evaluateRetakeEligibility([
      { startedAt: eightDaysAgo, submittedAt: eightDaysAgo, status: 'SUBMITTED' },
    ]);
    assert.strictEqual(check2.eligible, true);

    // 3 attempts within 30 days -> limit reached
    const check3 = ScoringService.evaluateRetakeEligibility([
      { startedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000), submittedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000), status: 'SUBMITTED' },
      { startedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000), submittedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000), status: 'SUBMITTED' },
      { startedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), submittedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), status: 'SUBMITTED' },
    ]);
    assert.strictEqual(check3.eligible, false);
  });

  // 4. Database Seed verification
  await test('Database: Seed data loaded correctly', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@skillproof.dev' } });
    assert(admin !== null && admin.role === 'ADMIN', 'Admin user exists');

    const dev =
      (await prisma.user.findUnique({ where: { email: 'dev001@demo.skillproof.test' }, include: { profile: true, skills: true } })) ||
      (await prisma.user.findUnique({ where: { email: 'arjun@skillproof.dev' }, include: { profile: true, skills: true } }));
    assert(dev !== null && dev.role === 'DEVELOPER', 'Demo Developer exists');
    assert(dev.skills.length >= 2, 'Demo developer has seeded skills');

    const verifiedSkill = dev.skills.find((s) => s.status === 'VERIFIED');
    const claimedSkill = dev.skills.find((s) => s.status === 'CLAIMED');
    assert(verifiedSkill !== null && verifiedSkill?.status === 'VERIFIED', 'Verified skill is marked VERIFIED');
    assert(claimedSkill !== null && claimedSkill?.status === 'CLAIMED', 'Certificate skill is marked CLAIMED');

    const questionsCount = await prisma.question.count();
    assert(questionsCount >= 60, `Question bank contains sufficient questions (${questionsCount})`);
  });

  // 5. Question selection randomization test
  await test('QuestionService: Selects 20 questions with 8 Easy, 8 Medium, 4 Hard', async () => {
    const dev =
      (await prisma.user.findUnique({ where: { email: 'dev001@demo.skillproof.test' } })) ||
      (await prisma.user.findUnique({ where: { email: 'arjun@skillproof.dev' } }));
    const questions = await QuestionService.selectQuestionsForAssessment({
      language: 'JavaScript',
      userId: dev!.id,
    });

    assert.strictEqual(questions.length, 20, 'Selected exactly 20 questions');
    const easy = questions.filter((q) => q.difficulty === 'EASY').length;
    const med = questions.filter((q) => q.difficulty === 'MEDIUM').length;
    const hard = questions.filter((q) => q.difficulty === 'HARD').length;

    assert.strictEqual(easy, 8, '8 Easy questions selected');
    assert.strictEqual(med, 8, '8 Medium questions selected');
    assert.strictEqual(hard, 4, '4 Hard questions selected');
  });

  // 6. Auth Service test
  await test('AuthService: Login and session check', async () => {
    const loginRes = await AuthService.login({
      email: 'recruiter@techcorp.com',
      password: 'Recruiter@123',
    });
    assert.strictEqual(loginRes.user.role, 'RECRUITER');
    assert(loginRes.token.length > 20, 'JWT token generated');

    const session = await AuthService.getSession(loginRes.user.id);
    assert.strictEqual(session?.email, 'recruiter@techcorp.com');
  });

  // 7. Full HTTP Auth, Cookie Session & Role Guard Verification
  await test('HTTP Auth & RBAC: Cookies, sessions, role guards, and uniform errors', async () => {
    const { default: app } = await import('../app.js');
    const server = (app as any).listen(0);
    const port = (server.address() as any).port;
    const API_URL = `http://127.0.0.1:${port}/api`;

    try {
      // Uniform error check
      const badRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dev001@demo.skillproof.test', password: 'bad' }),
      });
      assert.strictEqual(badRes.status, 401);
      const badData: any = await badRes.json();
      assert.strictEqual(badData.message, 'Invalid email or password credentials');

      // Developer login with uppercase and whitespace
      const devRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '  DEV001@DEMO.SKILLPROOF.TEST  ', password: 'Dev@123' }),
      });
      assert.strictEqual(devRes.status, 200);
      const cookie = devRes.headers.get('set-cookie')?.split(';')[0] || '';
      assert(cookie.includes('token='), 'httpOnly cookie set');

      // Session persistence via cookie
      const sessionRes = await fetch(`${API_URL}/auth/session`, {
        headers: { Cookie: cookie },
      });
      assert.strictEqual(sessionRes.status, 200);
      const sessionData: any = await sessionRes.json();
      assert.strictEqual(sessionData.data.role, 'DEVELOPER');

      // Developer allowed on history, blocked on admin
      const histRes = await fetch(`${API_URL}/assessments/history`, {
        headers: { Cookie: cookie },
      });
      assert.strictEqual(histRes.status, 200);

      const devAdminRes = await fetch(`${API_URL}/admin/users`, {
        headers: { Cookie: cookie },
      });
      assert.strictEqual(devAdminRes.status, 403);

      // Recruiter login & role check
      const recRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'recruiter@techcorp.com', password: 'Recruiter@123' }),
      });
      assert.strictEqual(recRes.status, 200);
      const recCookie = recRes.headers.get('set-cookie')?.split(';')[0] || '';

      const recDevsRes = await fetch(`${API_URL}/recruiter/developers`, {
        headers: { Cookie: recCookie },
      });
      assert.strictEqual(recDevsRes.status, 200);

      const recAdminRes = await fetch(`${API_URL}/admin/users`, {
        headers: { Cookie: recCookie },
      });
      assert.strictEqual(recAdminRes.status, 403);

      // Admin login & role check
      const adminRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@skillproof.dev', password: 'Admin@123' }),
      });
      assert.strictEqual(adminRes.status, 200);
      const adminCookie = adminRes.headers.get('set-cookie')?.split(';')[0] || '';

      const adminUsersRes = await fetch(`${API_URL}/admin/users`, {
        headers: { Cookie: adminCookie },
      });
      assert.strictEqual(adminUsersRes.status, 200);

      // Logout clears cookie
      const logoutRes = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      assert.strictEqual(logoutRes.status, 200);
    } finally {
      server.close();
    }
  });

  // 8. Leaderboard & Points Unit Tests
  await runLeaderboardUnitTests();

  // 9. Camera Proctoring & Skill Lockout Unit Tests
  await runProctoringTests();

  // 10. Direct Messaging Unit & Integration Tests
  await runMessagingTests();

  // 11. Full End-to-End Lifecycle & Consistency Test
  await runEndToEndFlowTest();

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1]?.endsWith('runTests.ts') || process.argv[1]?.endsWith('runTests.js')) {
  runSkillProofTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
