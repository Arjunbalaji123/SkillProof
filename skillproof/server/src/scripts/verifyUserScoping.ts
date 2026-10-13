import assert from 'assert';
import { prisma } from '../config/db.js';

const API_BASE = 'http://localhost:5000/api';

async function main() {
  console.log('======================================================================');
  console.log('🧪 VERIFYING USER DATA SCOPING, EMPTY STATES & ISOLATION');
  console.log('======================================================================\n');

  const ts = Date.now().toString(36);

  // ---------------------------------------------------------------------------
  // STEP 0: Health check & Cache-Control validation
  // ---------------------------------------------------------------------------
  console.log('▶ STEP 0: GET /api/health');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthBody: any = await healthRes.json();
  console.log('  Request:  GET', `${API_BASE}/health`);
  console.log('  Response:', healthRes.status, JSON.stringify(healthBody));
  console.log('  Headers Cache-Control:', healthRes.headers.get('cache-control'));
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthBody.success, true);
  console.log('  ✅ Health check OK\n');

  // ---------------------------------------------------------------------------
  // STEP 1: Register User A -> Brand new developer
  // ---------------------------------------------------------------------------
  const userAEmail = `dev_a_${ts}@cit.edu.in`;
  const userAUsername = `usera_${ts}`.slice(0, 18);
  const userAPassword = 'Password123!';

  console.log(`▶ STEP 1: Register User A (${userAEmail}, @${userAUsername})`);
  const regAReq = {
    name: 'Developer Alice',
    username: userAUsername,
    email: userAEmail,
    password: userAPassword,
    role: 'DEVELOPER',
  };
  console.log('  Request:  POST', `${API_BASE}/auth/register`);
  console.log('  Payload: ', JSON.stringify(regAReq, null, 2));

  const regARes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regAReq),
  });
  const regABody: any = await regARes.json();
  const rawCookieA = regARes.headers.get('set-cookie') || '';
  const cookieA = rawCookieA.split(';')[0];
  console.log('  Response:', regARes.status, JSON.stringify(regABody, null, 2));
  console.log('  Set-Cookie:', cookieA);
  assert.strictEqual(regARes.status, 201);
  assert.strictEqual(regABody.success, true);
  const userAId = regABody.data.user.id;
  assert(userAId, 'User A ID must be returned');

  // Data Integrity Verification for newly registered user in DB
  console.log('\n  Checking DB rows for newly registered User A...');
  const userASkillsInDb = await prisma.skill.count({ where: { userId: userAId } });
  const userAProjectsInDb = await prisma.project.count({ where: { userId: userAId } });
  const userAAssessmentsInDb = await prisma.assessment.count({ where: { userId: userAId } });
  const userALeaderboardInDb = await prisma.leaderboardEntry.count({ where: { userId: userAId } });
  console.log(`  User A DB counts -> Skills: ${userASkillsInDb}, Projects: ${userAProjectsInDb}, Assessments: ${userAAssessmentsInDb}, Leaderboard: ${userALeaderboardInDb}`);
  assert.strictEqual(userASkillsInDb, 0, 'No skills must be created for new user');
  assert.strictEqual(userAProjectsInDb, 0, 'No projects must be created for new user');
  assert.strictEqual(userAAssessmentsInDb, 0, 'No assessments must be created for new user');
  assert.strictEqual(userALeaderboardInDb, 0, 'No leaderboard entries must be created for new user');
  console.log('  ✅ DB Data Integrity confirmed: 0 skills, 0 projects, 0 assessments, 0 leaderboard entries');

  // Query User A Dashboard Summary
  console.log('\n  Fetching User A Dashboard Summary...');
  console.log('  Request:  GET', `${API_BASE}/dashboard/summary`);
  const dashARes = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: { Cookie: cookieA },
  });
  const dashABody: any = await dashARes.json();
  console.log('  Response:', dashARes.status, JSON.stringify(dashABody, null, 2));
  console.log('  Headers Cache-Control:', dashARes.headers.get('cache-control'));
  assert.strictEqual(dashARes.status, 200);
  assert.strictEqual(dashABody.success, true);
  assert.strictEqual(dashABody.data.verifiedCount, 0, 'User A must have 0 verified skills');
  assert.strictEqual(dashABody.data.claimedCount, 0, 'User A must have 0 claimed skills');
  assert.strictEqual(dashABody.data.averageVerifiedScore, 0, 'User A average verified score must be 0 (rendered as -)');
  assert.strictEqual(dashABody.data.projectCount, 0, 'User A must have 0 projects');
  assert.deepStrictEqual(dashABody.data.skills, [], 'User A skills list must be empty []');
  assert.deepStrictEqual(dashABody.data.recentAttempts, [], 'User A recent attempts must be empty []');
  assert(dashARes.headers.get('cache-control')?.includes('no-store'), 'Must send Cache-Control: no-store');
  console.log('  ✅ User A Dashboard is completely clean: verifiedCount=0, claimedCount=0, avgScore=0, projectCount=0, skills=[], attempts=[]');

  // Query User A Leaderboard Rank
  console.log('\n  Fetching User A Leaderboard standing...');
  console.log('  Request:  GET', `${API_BASE}/leaderboard?limit=1`);
  const lbARes = await fetch(`${API_BASE}/leaderboard?limit=1`, {
    headers: { Cookie: cookieA },
  });
  const lbABody: any = await lbARes.json();
  console.log('  Response:', lbARes.status, JSON.stringify(lbABody.data?.currentUserRank));
  assert.strictEqual(lbARes.status, 200);
  assert.strictEqual(lbABody.data.currentUserRank, null, 'User A must be Unranked (currentUserRank === null)');
  console.log('  ✅ User A Leaderboard is Unranked');

  // Query User A /api/skills and /api/projects
  const skillsARes = await fetch(`${API_BASE}/skills`, { headers: { Cookie: cookieA } });
  const skillsABody: any = await skillsARes.json();
  assert.deepStrictEqual(skillsABody.data, [], 'GET /api/skills must return [] for new user');

  const projARes = await fetch(`${API_BASE}/projects`, { headers: { Cookie: cookieA } });
  const projABody: any = await projARes.json();
  assert.deepStrictEqual(projABody.data, [], 'GET /api/projects must return [] for new user');
  console.log('  ✅ User A /api/skills and /api/projects return empty arrays\n');

  // ---------------------------------------------------------------------------
  // STEP 2: User A claims a skill and takes an assessment
  // ---------------------------------------------------------------------------
  console.log('▶ STEP 2: User A claims JavaScript and takes an assessment');
  const claimRes = await fetch(`${API_BASE}/skills/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
    },
    body: JSON.stringify({
      language: 'JavaScript',
      claimedLevel: 'Intermediate',
    }),
  });
  const claimBody: any = await claimRes.json();
  console.log('  Claim Response:', claimRes.status, JSON.stringify(claimBody));
  assert.strictEqual(claimRes.status, 201);

  // Start assessment
  console.log('\n  Starting JavaScript assessment for User A...');
  const startRes = await fetch(`${API_BASE}/assessments/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
    },
    body: JSON.stringify({ language: 'JavaScript' }),
  });
  const startBody: any = await startRes.json();
  console.log('  Start Response:', startRes.status, 'Assessment ID:', startBody.data?.assessmentId);
  assert.strictEqual(startRes.status, 201);
  const assessmentAId = startBody.data.assessmentId;
  const questions = startBody.data.questions;
  assert(assessmentAId, 'Assessment ID must be returned');

  // Answer all questions correctly to verify skill
  console.log(`  Answering ${questions.length} questions for User A...`);
  for (const q of questions) {
    const dbQ = await prisma.question.findUnique({ where: { id: q.questionId } });
    assert(dbQ, 'Question must exist in DB');
    const correctAns = JSON.parse(dbQ.correctAnswer);

    const ansRes = await fetch(`${API_BASE}/assessments/${assessmentAId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        order: q.order,
        userAnswer: correctAns,
      }),
    });
    assert.strictEqual(ansRes.status, 200);
  }

  // Submit assessment
  console.log('  Submitting assessment for automated server grading...');
  const submitRes = await fetch(`${API_BASE}/assessments/${assessmentAId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
    },
  });
  const submitBody: any = await submitRes.json();
  console.log('  Submit Response:', submitRes.status, 'Passed:', submitBody.data?.passed, 'Score:', submitBody.data?.scorePercent);
  assert.strictEqual(submitRes.status, 200);
  assert.strictEqual(submitBody.data.passed, true);

  // Re-fetch User A Dashboard
  console.log('\n  Re-fetching User A Dashboard Summary...');
  const updatedDashARes = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: { Cookie: cookieA },
  });
  const updatedDashABody: any = await updatedDashARes.json();
  console.log('  Updated Dashboard A:', JSON.stringify({
    verifiedCount: updatedDashABody.data.verifiedCount,
    claimedCount: updatedDashABody.data.claimedCount,
    averageVerifiedScore: updatedDashABody.data.averageVerifiedScore,
    skillsCount: updatedDashABody.data.skills.length,
    attemptsCount: updatedDashABody.data.recentAttempts.length,
  }));
  assert.strictEqual(updatedDashABody.data.verifiedCount, 1, 'User A must have 1 verified skill');
  assert.strictEqual(updatedDashABody.data.skills.length, 1);
  assert.strictEqual(updatedDashABody.data.recentAttempts.length, 1);
  assert(updatedDashABody.data.averageVerifiedScore > 0, 'User A average verified score must be > 0');

  // Re-fetch User A Leaderboard Rank
  const updatedLbARes = await fetch(`${API_BASE}/leaderboard?limit=1`, {
    headers: { Cookie: cookieA },
  });
  const updatedLbABody: any = await updatedLbARes.json();
  console.log('  Updated Leaderboard Rank A:', JSON.stringify(updatedLbABody.data.currentUserRank));
  assert(updatedLbABody.data.currentUserRank !== null, 'User A must now have a rank');
  assert(updatedLbABody.data.currentUserRank.rank >= 1, 'User A rank must be >= 1');
  console.log(`  ✅ User A has 1 verified skill, 1 attempt, score=${updatedDashABody.data.averageVerifiedScore}%, rank=#${updatedLbABody.data.currentUserRank.rank}\n`);

  // ---------------------------------------------------------------------------
  // STEP 3: Register User B -> Brand new developer
  // ---------------------------------------------------------------------------
  const userBEmail = `dev_b_${ts}@cit.edu.in`;
  const userBUsername = `userb_${ts}`.slice(0, 18);
  const userBPassword = 'Password123!';

  console.log(`▶ STEP 3: Register User B (${userBEmail}, @${userBUsername})`);
  const regBReq = {
    name: 'Developer Bob',
    username: userBUsername,
    email: userBEmail,
    password: userBPassword,
    role: 'DEVELOPER',
  };
  console.log('  Request:  POST', `${API_BASE}/auth/register`);
  const regBRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regBReq),
  });
  const regBBody: any = await regBRes.json();
  const rawCookieB = regBRes.headers.get('set-cookie') || '';
  const cookieB = rawCookieB.split(';')[0];
  console.log('  Response:', regBRes.status, JSON.stringify(regBBody, null, 2));
  assert.strictEqual(regBRes.status, 201);
  const userBId = regBBody.data.user.id;
  assert(userBId, 'User B ID must be returned');

  // Check User B Dashboard -> MUST BE COMPLETELY EMPTY!
  console.log('\n  Fetching User B Dashboard Summary (MUST BE COMPLETELY EMPTY)...');
  console.log('  Request:  GET', `${API_BASE}/dashboard/summary`);
  const dashBRes = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: { Cookie: cookieB },
  });
  const dashBBody: any = await dashBRes.json();
  console.log('  Response:', dashBRes.status, JSON.stringify(dashBBody, null, 2));
  assert.strictEqual(dashBRes.status, 200);
  assert.strictEqual(dashBBody.data.verifiedCount, 0, 'User B must NOT see User A verified skill');
  assert.strictEqual(dashBBody.data.claimedCount, 0, 'User B must have 0 claimed skills');
  assert.strictEqual(dashBBody.data.averageVerifiedScore, 0, 'User B average score must be 0 (rendered as -)');
  assert.strictEqual(dashBBody.data.projectCount, 0, 'User B must have 0 projects');
  assert.deepStrictEqual(dashBBody.data.skills, [], 'User B skills must NOT contain User A skills');
  assert.deepStrictEqual(dashBBody.data.recentAttempts, [], 'User B recent attempts must NOT contain User A attempts');

  // Check User B Leaderboard standing -> MUST BE UNRANKED
  console.log('\n  Fetching User B Leaderboard standing...');
  const lbBRes = await fetch(`${API_BASE}/leaderboard?limit=1`, {
    headers: { Cookie: cookieB },
  });
  const lbBBody: any = await lbBRes.json();
  console.log('  Response:', lbBRes.status, 'currentUserRank:', lbBBody.data?.currentUserRank);
  assert.strictEqual(lbBBody.data.currentUserRank, null, 'User B must be Unranked');
  console.log('  ✅ User B Dashboard is completely empty and Unranked (does NOT leak User A data!)\n');

  // ---------------------------------------------------------------------------
  // STEP 4: User B attempts to access User A assessment -> MUST RETURN 404
  // ---------------------------------------------------------------------------
  console.log(`▶ STEP 4: User B attempts GET /api/assessments/${assessmentAId} (User A's assessment)`);
  console.log('  Request:  GET', `${API_BASE}/assessments/${assessmentAId}`);
  const breachDetailsRes = await fetch(`${API_BASE}/assessments/${assessmentAId}`, {
    headers: { Cookie: cookieB },
  });
  const breachDetailsBody: any = await breachDetailsRes.json();
  console.log('  Response Status:', breachDetailsRes.status);
  console.log('  Response Body:  ', JSON.stringify(breachDetailsBody));
  assert.strictEqual(breachDetailsRes.status, 404, 'Must return 404 Not Found to hide existence of other user assessment');
  assert.strictEqual(breachDetailsBody.message, 'Assessment not found');
  console.log('  ✅ Confirmed 404 on cross-user assessment details access');

  console.log(`\n  User B attempts GET /api/assessments/${assessmentAId}/result (User A's assessment result)`);
  console.log('  Request:  GET', `${API_BASE}/assessments/${assessmentAId}/result`);
  const breachResultRes = await fetch(`${API_BASE}/assessments/${assessmentAId}/result`, {
    headers: { Cookie: cookieB },
  });
  const breachResultBody: any = await breachResultRes.json();
  console.log('  Response Status:', breachResultRes.status);
  console.log('  Response Body:  ', JSON.stringify(breachResultBody));
  assert.strictEqual(breachResultRes.status, 404, 'Must return 404 Not Found to hide existence of other user assessment result');
  assert.strictEqual(breachResultBody.message, 'Assessment not found');
  console.log('  ✅ Confirmed 404 on cross-user assessment results access\n');

  // ---------------------------------------------------------------------------
  // STEP 5: Log back into User A -> Verify User A still sees only User A's data
  // ---------------------------------------------------------------------------
  console.log('▶ STEP 5: Log back into User A');
  console.log('  Request:  POST', `${API_BASE}/auth/login`);
  const loginARes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: userAPassword }),
  });
  const loginABody: any = await loginARes.json();
  const rawLoginCookieA = loginARes.headers.get('set-cookie') || '';
  const newCookieA = rawLoginCookieA.split(';')[0];
  console.log('  Response:', loginARes.status, JSON.stringify(loginABody.data.user.email));
  assert.strictEqual(loginARes.status, 200);

  console.log('\n  Re-verifying User A Dashboard with newly established session...');
  const dashAAfterLogin = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: { Cookie: newCookieA },
  });
  const dashAAfterLoginBody: any = await dashAAfterLogin.json();
  console.log('  User A Dashboard:', JSON.stringify({
    verifiedCount: dashAAfterLoginBody.data.verifiedCount,
    skills: dashAAfterLoginBody.data.skills.map((s: any) => s.language),
    attempts: dashAAfterLoginBody.data.recentAttempts.length,
  }));
  assert.strictEqual(dashAAfterLoginBody.data.verifiedCount, 1);
  assert.strictEqual(dashAAfterLoginBody.data.skills[0].language, 'JavaScript');
  assert.strictEqual(dashAAfterLoginBody.data.recentAttempts.length, 1);
  console.log('  ✅ User A session cleanly retrieves User A data\n');

  console.log('======================================================================');
  console.log('🎉 ALL USER SCOPING & DATA ISOLATION VERIFICATION CHECKS PASSED!');
  console.log('======================================================================');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

