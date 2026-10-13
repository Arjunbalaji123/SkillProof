process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/db.js';
import app from '../app.js';

export async function runEndToEndFlowTest() {
  console.log('🧪 Running Complete End-to-End User Lifecycle & Score Consistency Test...');

  const server = (app as any).listen(0);
  const port = (server.address() as any).port;
  const API_URL = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now().toString(36);
  const testUser = {
    name: 'E2E Tester',
    username: `e2e_user_${timestamp}`,
    email: `e2e_${timestamp}@skillproof.test`,
    password: 'Password@123',
    role: 'DEVELOPER' as const,
  };

  try {
    // ----------------------------------------------------
    // STEP 1: Registration
    // ----------------------------------------------------
    console.log(`  1️⃣ Registering new user: @${testUser.username}...`);
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    assert.strictEqual(regRes.status, 201, 'Registration must return 201 Created');
    const regCookie = regRes.headers.get('set-cookie')?.split(';')[0] || '';
    assert(regCookie.includes('sp_session='), 'httpOnly session cookie must be set on register');
    const regData: any = await regRes.json();
    assert.strictEqual(regData.success, true);
    assert.strictEqual(regData.data.user.username, testUser.username);
    assert(!('passwordHash' in regData.data.user), 'Registration response must NOT leak passwordHash');
    const newUserId = regData.data.user.id;

    // ----------------------------------------------------
    // STEP 2: Login
    // ----------------------------------------------------
    console.log('  2️⃣ Logging in with credentials...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });

    assert.strictEqual(loginRes.status, 200, 'Login must return 200 OK');
    const authCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
    assert(authCookie.includes('sp_session='), 'httpOnly sp_session cookie must be set on login');
    const loginData: any = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    assert.strictEqual(loginData.data.user.username, testUser.username);
    assert(!('passwordHash' in loginData.data.user), 'Login response must NOT leak passwordHash');

    // ----------------------------------------------------
    // STEP 3: Refresh (Stays logged in across page reloads)
    // ----------------------------------------------------
    console.log('  3️⃣ Refreshing session (GET /api/auth/session via cookie)...');
    const sessionRes = await fetch(`${API_URL}/auth/session`, {
      headers: { Cookie: authCookie },
    });

    assert.strictEqual(sessionRes.status, 200, 'Session verification must return 200 OK');
    const sessionData: any = await sessionRes.json();
    assert.strictEqual(sessionData.success, true);
    const sessionUser = sessionData.data?.user || sessionData.data;
    assert.strictEqual(sessionUser.username, testUser.username);
    assert.strictEqual(sessionUser.role, 'DEVELOPER');
    assert(!('passwordHash' in sessionUser), 'Session response must NOT leak passwordHash');

    // ----------------------------------------------------
    // STEP 4: Claim a skill (Certificate claim)
    // ----------------------------------------------------
    console.log('  4️⃣ Claiming an unverified JavaScript skill with certificate URL...');
    const claimRes = await fetch(`${API_URL}/skills/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        language: 'JavaScript',
        claimedLevel: 'Intermediate',
        certificateUrl: 'https://coursera.org/verify/e2e-sample-cert',
      }),
    });

    assert.strictEqual(claimRes.status, 201, 'Skill claim must return 201 Created');
    const claimData: any = await claimRes.json();
    assert.strictEqual(claimData.success, true);
    assert.strictEqual(claimData.data.status, 'CLAIMED', 'New certificate claim must have status CLAIMED');
    assert.strictEqual(claimData.data.language, 'JavaScript');

    // ----------------------------------------------------
    // STEP 5: Take a test
    // ----------------------------------------------------
    console.log('  5️⃣ Starting test and answering questions...');
    const startRes = await fetch(`${API_URL}/assessments/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ language: 'JavaScript' }),
    });

    assert.strictEqual(startRes.status, 201);
    const startData: any = await startRes.json();
    const assessmentId = startData.data.assessmentId;
    const questions = startData.data.questions;
    assert.strictEqual(questions.length, 20, 'Assessment must contain 20 stratified questions');

    // Answer questions
    for (const q of questions) {
      const dbQ = await prisma.question.findUnique({ where: { id: q.questionId } });
      assert(dbQ, 'Question must exist in DB');
      const correctAns = JSON.parse(dbQ.correctAnswer);

      const ansRes = await fetch(`${API_URL}/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          order: q.order,
          userAnswer: correctAns,
        }),
      });
      const ansData: any = await ansRes.json();
      assert.strictEqual(ansData.success, true);
    }

    // ----------------------------------------------------
    // STEP 6: Submit test
    // ----------------------------------------------------
    console.log('  6️⃣ Submitting assessment for automated server grading...');
    const submitRes = await fetch(`${API_URL}/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
    });

    assert.strictEqual(submitRes.status, 200);
    const submitData: any = await submitRes.json();
    assert.strictEqual(submitData.success, true);
    const result = submitData.data;
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.scorePercent, 100);
    assert.strictEqual(result.level, 'Expert');
    const expectedScore = result.weightedPercent;

    // ----------------------------------------------------
    // STEP 7: Consistency check across all 4 surfaces
    // ----------------------------------------------------
    console.log('  7️⃣ Verifying exact score match across Dashboard, Skills, Leaderboard & Portfolio...');

    // A. Dashboard
    const dashRes = await fetch(`${API_URL}/dashboard/summary`, {
      headers: { Cookie: authCookie },
    });
    const dashData: any = await dashRes.json();
    assert.strictEqual(dashData.data.verifiedCount, 1);
    const dashSkill = dashData.data.skills[0];
    assert.strictEqual(dashSkill.bestScore, expectedScore, 'Dashboard score must match assessment score');
    assert.strictEqual(dashSkill.status, 'VERIFIED');

    // B. Skills Page
    const skillsRes = await fetch(`${API_URL}/skills`, {
      headers: { Cookie: authCookie },
    });
    const skillsData: any = await skillsRes.json();
    const verifiedSkill = skillsData.data.find((s: any) => s.language === 'JavaScript');
    assert(verifiedSkill);
    assert.strictEqual(verifiedSkill.status, 'VERIFIED');
    assert.strictEqual(verifiedSkill.bestScore, expectedScore, 'Skills page score must match assessment score');

    // C. Leaderboard
    const lbRes = await fetch(`${API_URL}/leaderboard?scope=global&period=all&limit=100`, {
      headers: { Cookie: authCookie },
    });
    const lbData: any = await lbRes.json();
    assert(lbData.data.currentUserRank !== null, 'User must have rank on leaderboard');
    const userLbEntry = lbData.data.entries.find((e: any) => e.userId === newUserId);
    assert(userLbEntry, 'User must appear on leaderboard entries list');
    assert.strictEqual(userLbEntry.topSkill.score, expectedScore, 'Leaderboard topSkill score must match assessment score');
    assert(!('email' in userLbEntry), 'Leaderboard entry must NOT leak email');

    // D. Public Portfolio
    const portfolioRes = await fetch(`${API_URL}/profile/public/${testUser.username}`);
    assert.strictEqual(portfolioRes.status, 200, 'Public portfolio must be accessible');
    const portfolioData: any = await portfolioRes.json();
    const portSkill = portfolioData.data.verifiedSkills.find((s: any) => s.language === 'JavaScript');
    assert(portSkill, 'Public portfolio must list verified JavaScript skill');
    assert.strictEqual(portSkill.score, expectedScore, 'Public portfolio score must match assessment score');
    assert(!('email' in portfolioData.data), 'Public portfolio must NOT leak email');
    assert(!('passwordHash' in portfolioData.data), 'Public portfolio must NOT leak passwordHash');

    console.log(`     ✅ Exact score match confirmed across all surfaces: ${expectedScore}% (Expert)!`);
    console.log('     ✅ Zero email or passwordHash leakage confirmed in all endpoints!');
  } finally {
    const e2eUsers = await prisma.user.findMany({
      where: { username: { startsWith: 'e2e_user_' } },
      select: { id: true },
    });
    const e2eIds = e2eUsers.map((u) => u.id);
    if (e2eIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: e2eIds } } });
      await prisma.user.deleteMany({ where: { id: { in: e2eIds } } });
      const { LeaderboardService } = await import('../services/leaderboardService.js');
      await LeaderboardService.rebuildAll();
    }
    server.close();
  }
}

if (process.argv[1]?.includes('endToEndFlowTest')) {
  runEndToEndFlowTest()
    .then(() => {
      console.log('🎉 E2E Flow Test Passed Completely!\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ E2E Flow Test Failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

