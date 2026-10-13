process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/db.js';
import app from '../app.js';
import { LeaderboardService } from '../services/leaderboardService.js';

async function runVerification() {
  console.log('🚀 Starting Verification for User "Arjun Balaji S" (sbalajiarjun@gmail.com)...');

  const server = (app as any).listen(0);
  const port = (server.address() as any).port;
  const API_URL = `http://127.0.0.1:${port}/api`;

  try {
    // ----------------------------------------------------
    // STEP 1: Log in as the real user ("Arjun Balaji S")
    // ----------------------------------------------------
    console.log('\n1️⃣ Logging in as "Arjun Balaji S" (sbalajiarjun@gmail.com)...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sbalajiarjun@gmail.com', password: 'Dev@123' }),
    });

    assert.strictEqual(loginRes.status, 200, 'Login must succeed with 200');
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
    assert(cookie.includes('token='), 'httpOnly auth cookie must be set');

    // Confirm session
    const sessionRes = await fetch(`${API_URL}/auth/session`, {
      headers: { Cookie: cookie },
    });
    const sessionData: any = await sessionRes.json();
    assert.strictEqual(sessionData.success, true);
    assert.strictEqual(sessionData.data.email, 'sbalajiarjun@gmail.com');
    assert.strictEqual(sessionData.data.username, 'arjun_balaji_s');
    assert.strictEqual(sessionData.data.name, 'Arjun Balaji S');
    assert.strictEqual(sessionData.data.role, 'DEVELOPER');
    const realUserId = sessionData.data.id;
    console.log(`   Logged in successfully as ${sessionData.data.name} (@${sessionData.data.username}, ID: ${realUserId})`);

    // Confirm Dashboard shows 0 verified skills, 0% average
    const dashRes = await fetch(`${API_URL}/dashboard/summary`, {
      headers: { Cookie: cookie },
    });
    const dashData: any = await dashRes.json();
    assert.strictEqual(dashData.success, true);
    assert.strictEqual(dashData.data.verifiedCount, 0, 'Verified skills count must be 0');
    assert.strictEqual(dashData.data.averageVerifiedScore, 0, 'Average verified score must be 0%');
    assert.strictEqual(dashData.data.skills.length, 0, 'Initial skills must be empty');
    console.log('   Dashboard confirmed: 0 verified skills, 0% average, 0 claimed skills');

    // Confirm Leaderboard shows Unranked / null rank for this user
    const lbRes = await fetch(`${API_URL}/leaderboard?scope=global&period=all&limit=50`, {
      headers: { Cookie: cookie },
    });
    const lbData: any = await lbRes.json();
    assert.strictEqual(lbData.success, true);
    assert.strictEqual(lbData.data.currentUserRank, null, 'User with 0 verified skills must be Unranked (currentUserRank = null)');
    const foundInEntries = lbData.data.entries.some((e: any) => e.userId === realUserId);
    assert.strictEqual(foundInEntries, false, 'User with 0 verified skills must NOT appear on ranked leaderboard');
    console.log('   Leaderboard confirmed: Unranked, 0 points, not listed on leaderboard table');

    // ----------------------------------------------------
    // STEP 2: Take and pass a JavaScript test as that user
    // ----------------------------------------------------
    console.log('\n2️⃣ Starting and submitting a real JavaScript assessment...');
    const startRes = await fetch(`${API_URL}/assessments/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ language: 'JavaScript' }),
    });

    const startData: any = await startRes.json();
    assert.strictEqual(startData.success, true, 'Assessment start must succeed');
    const assessmentId = startData.data.assessmentId;
    const questions = startData.data.questions;
    assert.strictEqual(questions.length, 20, 'Assessment must contain 20 questions');
    console.log(`   Assessment started: ID ${assessmentId} with ${questions.length} questions`);

    // Answer questions with correct answers
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Lookup actual correct answer from DB
      const dbQ = await prisma.question.findUnique({ where: { id: q.questionId } });
      assert(dbQ, 'Question must exist in DB');
      const correctAns = JSON.parse(dbQ.correctAnswer);

      const ansRes = await fetch(`${API_URL}/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          order: q.order,
          userAnswer: correctAns,
        }),
      });
      const ansData: any = await ansRes.json();
      assert.strictEqual(ansData.success, true);
    }

    // Submit assessment
    const submitRes = await fetch(`${API_URL}/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
    });
    const submitData: any = await submitRes.json();
    assert.strictEqual(submitData.success, true, 'Assessment submission must succeed');
    const result = submitData.data;
    assert.strictEqual(result.passed, true, 'Assessment must be passed');
    assert(result.scorePercent >= 90, `Expected score >= 90%, got ${result.scorePercent}%`);
    assert.strictEqual(result.level, 'Expert');
    console.log(`   Assessment graded by ScoringService: ${result.scorePercent}% score, weighted=${result.weightedPercent}%, level=${result.level}`);

    // ----------------------------------------------------
    // STEP 3: Confirm immediate dashboard update
    // ----------------------------------------------------
    console.log('\n3️⃣ Verifying immediate dashboard, leaderboard, and skills consistency...');
    const postDashRes = await fetch(`${API_URL}/dashboard/summary`, {
      headers: { Cookie: cookie },
    });
    const postDashData: any = await postDashRes.json();
    assert.strictEqual(postDashData.success, true);
    assert.strictEqual(postDashData.data.verifiedCount, 1, 'Dashboard verified count must now be 1');
    assert.strictEqual(postDashData.data.skills.length, 1, 'Dashboard must show 1 skill');
    const verifiedSkill = postDashData.data.skills[0];
    assert.strictEqual(verifiedSkill.language, 'JavaScript');
    assert.strictEqual(verifiedSkill.status, 'VERIFIED');
    assert.strictEqual(verifiedSkill.bestScore, result.weightedPercent);
    assert.strictEqual(verifiedSkill.level, result.level);
    console.log(`   Dashboard: verifiedCount=1, skill=JavaScript, score=${verifiedSkill.bestScore}%, level=${verifiedSkill.level}`);

    // Confirm Leaderboard now reflects the user with rank and points
    const postLbRes = await fetch(`${API_URL}/leaderboard?scope=global&period=all&limit=50`, {
      headers: { Cookie: cookie },
    });
    const postLbData: any = await postLbRes.json();
    assert.strictEqual(postLbData.success, true);
    assert(postLbData.data.currentUserRank !== null, 'currentUserRank must no longer be null');
    const userRank = postLbData.data.currentUserRank;
    assert(userRank.rank >= 1, `Rank must be >= 1, got #${userRank.rank}`);
    assert(userRank.points > 0, `Points must be > 0, got ${userRank.points}`);
    console.log(`   Leaderboard: Rank #${userRank.rank} with ${userRank.points} pts`);

    // Verify Skills page API
    const skillsRes = await fetch(`${API_URL}/skills`, {
      headers: { Cookie: cookie },
    });
    const skillsData: any = await skillsRes.json();
    assert.strictEqual(skillsData.success, true);
    const userSkills = skillsData.data;
    const jsSkill = userSkills.find((s: any) => s.language === 'JavaScript');
    assert(jsSkill, 'JavaScript skill must exist on skills page');
    assert.strictEqual(jsSkill.status, 'VERIFIED');
    assert.strictEqual(jsSkill.bestScore, result.weightedPercent);
    assert.strictEqual(jsSkill.level, result.level);
    console.log(`   Skills page: status=${jsSkill.status}, bestScore=${jsSkill.bestScore}%, level=${jsSkill.level}`);

    // Confirm EXACT match across Dashboard, Skills page, and Leaderboard
    assert.strictEqual(verifiedSkill.bestScore, jsSkill.bestScore, 'Score must match between Dashboard and Skills');
    assert.strictEqual(verifiedSkill.level, jsSkill.level, 'Level must match between Dashboard and Skills');
    const entryOnLb = postLbData.data.entries.find((e: any) => e.userId === realUserId);
    if (entryOnLb) {
      assert.strictEqual(entryOnLb.points, userRank.points, 'Points on leaderboard row must match currentUserRank points');
      assert.strictEqual(entryOnLb.topSkill.score, jsSkill.bestScore, 'Top skill score on leaderboard must match verified bestScore');
    }
    console.log('   ✅ EXACT MATCH CONFIRMED across Dashboard, Skills page, and Leaderboard!');

    // ----------------------------------------------------
    // STEP 4: Run safety net consistency check
    // ----------------------------------------------------
    console.log('\n4️⃣ Running safety net validation for all database records...');
    const consistency = await LeaderboardService.validateConsistency();
    assert.strictEqual(consistency.valid, true, 'Database must be 100% consistent');
    assert.strictEqual(consistency.issues.length, 0, '0 consistency issues found');
    console.log('   ✅ Safety net passed: 0 discrepancies across all LeaderboardEntry records.');

    console.log('\n🎉 ALL VERIFICATION CRITERIA MET WITH 100% SUCCESS!');
  } finally {
    server.close();
  }
}

runVerification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
