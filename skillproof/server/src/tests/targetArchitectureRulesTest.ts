import assert from 'assert';
import { prisma } from '../config/db.js';
import { AuthService } from '../services/authService.js';
import { AssessmentService } from '../services/assessmentService.js';
import { ScoringService } from '../services/scoringService.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import { ProctorService } from '../services/proctorService.js';
import { RecruiterService } from '../services/recruiterService.js';
import { OpeningService } from '../services/openingService.js';
import { MessageService } from '../services/messageService.js';
import { NotificationService } from '../services/notificationService.js';
import { PortfolioService } from '../services/portfolioService.js';
import { SkillService } from '../services/skillService.js';

async function runTargetArchitectureRulesTest() {
  console.log('🏛️ Running Target Architecture Rules & E2E Verification Suite...\n');

  const timestamp = Date.now().toString(36);

  // =========================================================================
  // RULE 1: Recruiter discovery and the leaderboard use VERIFIED skills only
  // =========================================================================
  console.log('▶ Rule 1: Recruiter discovery and Leaderboard use VERIFIED skills only');
  const { user: user1 } = await AuthService.register({
    name: 'Rule1 Dev',
    email: `rule1_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `r1_dev_${timestamp}`,
    role: 'DEVELOPER',
  });

  // Add 1 CLAIMED skill (unverified certificate) and 1 VERIFIED skill
  const jsSkill = await SkillService.claimSkill(user1.id, {
    language: 'JavaScript',
    claimedLevel: 'Expert',
    certificateUrl: 'https://example.com/unverified_cert.pdf',
  });
  assert.strictEqual(jsSkill.status, 'CLAIMED');

  const pythonCatalog = await prisma.skillCatalog.findFirst({ where: { name: 'Python' } });
  const pySkill = await prisma.skill.create({
    data: {
      userId: user1.id,
      skillCatalogId: pythonCatalog?.id || null,
      language: 'Python',
      claimedLevel: 'Advanced',
      status: 'VERIFIED',
      bestScore: 88,
      verifiedAt: new Date(),
    },
  });

  const lbBreakdown = await LeaderboardService.calculateUserPoints(user1.id);
  assert(lbBreakdown, 'User points breakdown must exist');
  assert.strictEqual(lbBreakdown.verifiedSkills.length, 1, 'Only 1 skill must be counted on leaderboard');
  assert.strictEqual(lbBreakdown.verifiedSkills[0].language, 'Python', 'Leaderboard must count Python only');
  assert(!lbBreakdown.verifiedSkills.some((v: any) => v.language === 'JavaScript'), 'Leaderboard must NEVER count CLAIMED skills');

  await LeaderboardService.rebuildAll();
  const lbEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId: user1.id, scope: 'GLOBAL' },
  });
  assert(lbEntry, 'LeaderboardEntry must exist');
  const parsedVerified = JSON.parse(lbEntry.verifiedSkills);
  assert.deepStrictEqual(parsedVerified, ['Python'], 'LeaderboardEntry verifiedSkills must contain only VERIFIED skills');

  // Verify Recruiter Discovery
  const { user: recruiterUser } = await AuthService.register({
    name: 'Rule1 Recruiter',
    email: `rec_rule1_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `r1_rec_${timestamp}`,
    role: 'RECRUITER',
    companyName: 'Rule1 Tech',
    jobTitle: 'Talent Lead',
  });
  await prisma.recruiterProfile.update({
    where: { userId: recruiterUser.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  const discoveryDevs = await RecruiterService.searchVerifiedDevelopers(recruiterUser.id, {
    language: 'Python',
  });
  const devInDiscovery = discoveryDevs.find((d) => d.id === user1.id);
  assert(devInDiscovery, 'Developer with verified Python must appear in recruiter discovery');
  assert.strictEqual(devInDiscovery.verifiedSkills.length, 1);
  assert.strictEqual(devInDiscovery.verifiedSkills[0].language, 'Python');
  assert.strictEqual(devInDiscovery.claimedSkills.length, 1);
  assert.strictEqual(devInDiscovery.claimedSkills[0].language, 'JavaScript');
  assert.strictEqual(devInDiscovery.claimedSkills[0].verified, false);
  console.log('  ✅ Confirmed: Recruiter discovery & leaderboard strictly use VERIFIED skills only.\n');

  // =========================================================================
  // RULE 2: Messaging restrictions & per-recruiter unlock rules
  // =========================================================================
  console.log('▶ Rule 2: Messaging restrictions & Per-recruiter unlock rules');
  const { user: user2 } = await AuthService.register({
    name: 'Rule2 Dev Peer',
    email: `rule2_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `r2_peer_${timestamp}`,
    role: 'DEVELOPER',
  });

  // Developer cannot start direct conversation with recruiter
  let devToRecErr = false;
  try {
    await MessageService.startDirectConversation(user1.id, recruiterUser.username!, 'Hello recruiter');
  } catch (err: any) {
    devToRecErr = true;
    assert.strictEqual(err.statusCode, 403, 'Must return 403 for developer starting direct conversation');
  }
  assert.strictEqual(devToRecErr, true, 'Developer direct conversation initiation blocked');

  // Developer cannot message another developer
  let devToDevErr = false;
  try {
    await MessageService.startDirectConversation(user1.id, user2.username!, 'Hello peer');
  } catch (err: any) {
    devToDevErr = true;
    assert.strictEqual(err.statusCode, 403, 'Must return 403 for peer-to-peer message');
  }
  assert.strictEqual(devToDevErr, true, 'Peer-to-peer developer messaging blocked');

  // Recruiter A creates opening and developer approaches
  const track = await prisma.track.findFirst();
  assert(track, 'Track must exist');
  const opening = await OpeningService.createOpening(recruiterUser.id, {
    title: `Rule 2 Python Role ${timestamp}`,
    trackId: track.id,
    description: 'Looking for verified Python engineers.',
    minLevel: 'Basic',
    minScore: 50,
    positions: 2,
    skillCatalogIds: [pythonCatalog!.id],
  });

  // Backfill interests so developer matches
  await prisma.developerInterest.create({
    data: { userId: user1.id, trackId: track.id, skillCatalogId: pythonCatalog!.id },
  });

  // Developer approaches opening
  const approachRes = await MessageService.approachOpening(user1.id, opening.id, 'I am excited about this role!');
  assert.strictEqual(approachRes.approach.status, 'PENDING');
  assert.strictEqual(approachRes.conversationStatus, 'PENDING_APPROVAL');

  // Developer cannot send a second message while pending
  let secondMsgErr = false;
  try {
    await MessageService.sendMessage(user1.id, approachRes.conversationId, 'Second message should fail');
  } catch (err: any) {
    secondMsgErr = true;
    assert.strictEqual(err.statusCode, 403, 'Must return 403 for second message while approach is pending');
  }
  assert.strictEqual(secondMsgErr, true, 'Developer cannot send second message before acceptance');

  // Recruiter A accepts approach -> unlocks chat
  const decideRes = await MessageService.decideApproach(
    recruiterUser.id,
    approachRes.approach.id,
    'ACCEPTED'
  );
  assert.strictEqual(decideRes.conversationStatus, 'ACTIVE');

  // Both can now send messages
  const devMsg = await MessageService.sendMessage(user1.id, decideRes.conversationId!, 'Thank you for accepting!');
  assert(devMsg.id, 'Developer message sent in unlocked chat');
  const recMsg = await MessageService.sendMessage(recruiterUser.id, decideRes.conversationId!, 'Welcome aboard!');
  assert(recMsg.id, 'Recruiter message sent in unlocked chat');

  // Verify second recruiter (Recruiter B) stays locked!
  const { user: recruiterB } = await AuthService.register({
    name: 'Recruiter B',
    email: `rec_b_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `rec_b_${timestamp}`,
    role: 'RECRUITER',
    companyName: 'Company B',
    jobTitle: 'Recruiter',
  });
  await prisma.recruiterProfile.update({
    where: { userId: recruiterB.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  let recBUnlocked = false;
  try {
    // Developer tries to message Recruiter B without an accepted opening
    const dummyConv = await prisma.conversation.create({
      data: {
        recruiterId: recruiterB.id,
        developerId: user1.id,
        origin: 'OPENING',
        status: 'PENDING_APPROVAL',
      },
    });
    await MessageService.sendMessage(user1.id, dummyConv.id, 'Hello Recruiter B');
    recBUnlocked = true;
  } catch (err: any) {
    assert.strictEqual(err.statusCode, 403);
  }
  assert.strictEqual(recBUnlocked, false, 'Unlock is strictly per recruiter-developer pair');
  console.log('  ✅ Confirmed: Developer message restrictions and per-recruiter unlock rules enforced.\n');

  // =========================================================================
  // RULE 3: Camera Proctoring: 2 warnings, then 2-day skill lockout
  // =========================================================================
  console.log('▶ Rule 3: Camera Proctoring 2 warnings, then 2-day skill lockout');
  const { user: testDev } = await AuthService.register({
    name: 'Proctor Test Dev',
    email: `proctor_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `proc_${timestamp}`,
    role: 'DEVELOPER',
  });

  // Start assessment in Python
  const startAssess = await AssessmentService.startAssessment(testDev.id, 'Python');
  const assessId = startAssess.assessmentId;

  const t0 = new Date();
  // 1st violation -> warning 1
  const ev1 = await ProctorService.recordProctorEvent(
    testDev.id,
    assessId,
    'PHONE',
    null,
    t0
  );
  assert.strictEqual(ev1.counted, true);
  assert.strictEqual(ev1.warningNumber, 1);
  assert.strictEqual(ev1.remainingWarnings, 1);
  assert.strictEqual(ev1.status, 'IN_PROGRESS');

  // Advance clock past 20-second cooldown (+25s)
  const t25 = new Date(t0.getTime() + 25 * 1000);
  const ev2 = await ProctorService.recordProctorEvent(
    testDev.id,
    assessId,
    'NO_FACE',
    null,
    t25
  );
  assert.strictEqual(ev2.counted, true);
  assert.strictEqual(ev2.warningNumber, 2);
  assert.strictEqual(ev2.remainingWarnings, 0);
  assert.strictEqual(ev2.status, 'IN_PROGRESS');

  // Advance clock past 20-second cooldown (+50s)
  // 3rd violation -> 3rd strike! Automatic termination & 2-day skill lockout
  const t50 = new Date(t0.getTime() + 50 * 1000);
  const ev3 = await ProctorService.recordProctorEvent(
    testDev.id,
    assessId,
    'BOOK',
    null,
    t50
  );
  assert.strictEqual(ev3.counted, true);
  assert.strictEqual(ev3.warningNumber, 3);
  assert.strictEqual(ev3.status, 'TERMINATED');

  // Verify assessment is TERMINATED and lockout created
  const termAssess = await prisma.assessment.findUnique({ where: { id: assessId } });
  assert.strictEqual(termAssess?.status, 'TERMINATED');
  assert.strictEqual(termAssess?.scorePercent, null, 'Terminated assessment must have no score');

  const lockout = await prisma.skillLockout.findFirst({
    where: { userId: testDev.id, skillCatalogId: pythonCatalog!.id },
  });
  assert(lockout, 'SkillLockout must be created for 2-day lockout');
  assert.strictEqual(lockout.liftedByAdmin, false);

  // Verify starting new test in Python is rejected
  let lockedOutErr = false;
  try {
    await AssessmentService.startAssessment(testDev.id, 'Python');
  } catch (err: any) {
    lockedOutErr = true;
    assert(err.statusCode === 400 || err.statusCode === 403, 'Must reject starting locked skill');
    assert(err.lockedUntil, 'Must include lockedUntil date');
  }
  assert.strictEqual(lockedOutErr, true, 'Locked skill test start blocked');
  console.log('  ✅ Confirmed: 2 warnings enforced, 3rd strike triggers TERMINATED and 2-day skill lockout.\n');

  // =========================================================================
  // RULE 4: Zero email or passwordHash leakage across all API response DTOs
  // =========================================================================
  console.log('▶ Rule 4: Zero email or passwordHash leakage across all endpoints');
  const portfolioDto = await PortfolioService.getPublicPortfolioBySlug(user1.username!);
  const portfolioJson = JSON.stringify(portfolioDto);
  assert(!portfolioJson.includes('email'), 'Portfolio DTO must NOT contain email');
  assert(!portfolioJson.includes('passwordHash'), 'Portfolio DTO must NOT contain passwordHash');

  const leaderboardDto = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all' });
  const lbJson = JSON.stringify(leaderboardDto);
  assert(!lbJson.includes('email'), 'Leaderboard DTO must NOT contain email');
  assert(!lbJson.includes('passwordHash'), 'Leaderboard DTO must NOT contain passwordHash');

  const discoveryDto = await RecruiterService.searchVerifiedDevelopers(recruiterUser.id, {});
  const discJson = JSON.stringify(discoveryDto);
  assert(!discJson.includes('email'), 'Recruiter discovery DTO must NOT contain email');
  assert(!discJson.includes('passwordHash'), 'Recruiter discovery DTO must NOT contain passwordHash');

  const messagesDto = await MessageService.getConversationMessages(user1.id, decideRes.conversationId!);
  const msgJson = JSON.stringify(messagesDto);
  assert(!msgJson.includes('email'), 'Messages DTO must NOT contain email');
  assert(!msgJson.includes('passwordHash'), 'Messages DTO must NOT contain passwordHash');

  const openingsDto = await OpeningService.getMatchingOpeningsForDeveloper(user1.id);
  const opJson = JSON.stringify(openingsDto);
  assert(!opJson.includes('email'), 'Openings DTO must NOT contain email');
  assert(!opJson.includes('passwordHash'), 'Openings DTO must NOT contain passwordHash');

  const notifsDto = await NotificationService.listNotifications(user1.id);
  const notifJson = JSON.stringify(notifsDto);
  assert(!notifJson.includes('email'), 'Notifications DTO must NOT contain email');
  assert(!notifJson.includes('passwordHash'), 'Notifications DTO must NOT contain passwordHash');
  console.log('  ✅ Confirmed: 0 email or passwordHash leakage across all DTO responses.\n');

  // =========================================================================
  // RULE 5: Exact score match across Dashboard, Skills, Leaderboard & Portfolio
  // =========================================================================
  console.log('▶ Rule 5: Score consistency across Dashboard, Skills, Leaderboard & Portfolio');
  const { user: scoreDev } = await AuthService.register({
    name: 'Consistent Score Dev',
    email: `score_match_${timestamp}@skillproof.test`,
    password: 'Password123!',
    username: `score_${timestamp}`,
    role: 'DEVELOPER',
  });

  // Create real verified skill and submitted assessment
  const javaCatalog = await prisma.skillCatalog.findFirst({ where: { name: 'Java' } });
  assert(javaCatalog, 'Java catalog exists');

  const javaSkill = await prisma.skill.create({
    data: {
      userId: scoreDev.id,
      skillCatalogId: javaCatalog.id,
      language: 'Java',
      claimedLevel: 'Advanced',
      status: 'VERIFIED',
      bestScore: 85,
      verifiedAt: new Date(),
    },
  });

  await prisma.assessment.create({
    data: {
      userId: scoreDev.id,
      skillId: javaSkill.id,
      skillCatalogId: javaCatalog.id,
      language: 'Java',
      status: 'SUBMITTED',
      scorePercent: 85,
      weightedPercent: 85,
      level: 'Advanced',
      submittedAt: new Date(),
    },
  });

  await LeaderboardService.rebuildAll();

  // 1. Dashboard summary
  const dashSummary = await SkillService.getDashboardSummary(scoreDev.id);
  assert.strictEqual(dashSummary.verifiedCount, 1);
  assert.strictEqual(dashSummary.averageVerifiedScore, 85);

  // 2. Skills manager list
  const userSkills = await SkillService.getUserSkills(scoreDev.id);
  const javaUserSkill = userSkills.find((s) => s.language === 'Java');
  assert(javaUserSkill);
  assert.strictEqual(javaUserSkill.bestScore, 85);
  assert.strictEqual(javaUserSkill.status, 'VERIFIED');

  // 3. Leaderboard
  const lbSearch = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all', currentUserId: scoreDev.id });
  assert.strictEqual(lbSearch.currentUserRank?.points, 85 * 2.0 + 5); // 85 * Advanced(2.0) + 0 (breadth for 1 skill) + weekly(5) = 175

  // 4. Public Portfolio
  const portSearch = await PortfolioService.getPublicPortfolioBySlug(scoreDev.username!);
  assert(portSearch);
  assert.strictEqual(portSearch.verifiedSkills.length, 1);
  assert.strictEqual(portSearch.verifiedSkills[0].score, 85);
  assert.strictEqual(portSearch.verifiedSkills[0].level, 'Advanced');
  console.log('  ✅ Confirmed: Exact score match (85% Advanced) verified across all 4 surfaces.\n');

  // =========================================================================
  // SECTION 6: Complete End-to-End User Lifecycle & Real-Time Hiring Flow
  // =========================================================================
  console.log('▶ Section 6: Complete E2E Lifecycle & Real-Time Hiring Flow');
  const e2eUsername = `e2e_full_${timestamp}`;
  const e2eEmail = `${e2eUsername}@test.skillproof.dev`;

  // 1. Register
  const { user: registeredDev } = await AuthService.register({
    name: 'E2E Verified Developer',
    email: e2eEmail,
    password: 'Password123!',
    username: e2eUsername,
    role: 'DEVELOPER',
  });
  assert.strictEqual(registeredDev.username, e2eUsername);

  // 2. Log in
  const loginRes = await AuthService.login({ email: e2eEmail, password: 'Password123!' });
  assert(loginRes.token, 'Session token issued');
  assert.strictEqual(loginRes.user.username, e2eUsername);

  // 3. Claim skill (unverified certificate)
  const claimed = await SkillService.claimSkill(registeredDev.id, {
    language: 'JavaScript',
    claimedLevel: 'Intermediate',
    certificateUrl: 'https://example.com/js_cert.pdf',
  });
  assert.strictEqual(claimed.status, 'CLAIMED');

  // 4. Take proctored assessment
  const assess = await AssessmentService.startAssessment(registeredDev.id, 'JavaScript');
  const e2eAssessId = assess.assessmentId;
  assert.strictEqual(assess.status, 'IN_PROGRESS');

  // Answer questions and submit
  const qList = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: e2eAssessId },
    include: { question: true },
  });
  for (const aq of qList) {
    const correctAns = JSON.parse(aq.question.correctAnswer);
    await AssessmentService.saveAnswer(registeredDev.id, e2eAssessId, aq.order, correctAns);
  }

  const submitRes = await AssessmentService.submitAssessment(registeredDev.id, e2eAssessId);
  assert.strictEqual(submitRes.status, 'SUBMITTED');
  assert.strictEqual(submitRes.passed, true);
  assert.strictEqual(submitRes.level, 'Expert');
  assert.strictEqual(submitRes.weightedPercent, 100);

  // 5. Recruiter creates active opening matching JavaScript
  const { user: e2eRecruiter } = await AuthService.register({
    name: 'E2E Tech Recruiter',
    email: `e2e_rec_${timestamp}@test.skillproof.dev`,
    password: 'Password123!',
    username: `e2e_rec_${timestamp}`,
    role: 'RECRUITER',
    companyName: 'Apex Cloud Labs',
    jobTitle: 'Senior Tech Recruiter',
  });
  await prisma.recruiterProfile.update({
    where: { userId: e2eRecruiter.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  const jsCatalog = await prisma.skillCatalog.findFirst({ where: { name: 'JavaScript' } });
  const e2eOpening = await OpeningService.createOpening(e2eRecruiter.id, {
    title: `Lead Frontend Engineer ${timestamp}`,
    trackId: track.id,
    description: 'Build mission-critical interfaces with JavaScript & React.',
    minLevel: 'Basic',
    minScore: 60,
    positions: 3,
    skillCatalogIds: [jsCatalog!.id],
  });

  // 6. Matching developer gets notification
  const notifyRes = await NotificationService.notifyMatches(e2eOpening.id);
  assert(notifyRes.notifiedCount >= 1, 'Matching developer must be notified');

  const devNotifs = await NotificationService.listNotifications(registeredDev.id);
  const matchNotif = devNotifs.notifications.find((n) => n.entityId === e2eOpening.id && n.type === 'OPENING_MATCH');
  assert(matchNotif, 'Developer received opening match notification');

  // 7. Developer approaches recruiter with intro
  const e2eApproach = await MessageService.approachOpening(
    registeredDev.id,
    e2eOpening.id,
    'I scored 100% on JavaScript and would love to join Apex Cloud!'
  );
  assert.strictEqual(e2eApproach.approach.status, 'PENDING');

  // 8. Recruiter accepts approach -> Chat works
  const acceptRes = await MessageService.decideApproach(
    e2eRecruiter.id,
    e2eApproach.approach.id,
    'ACCEPTED'
  );
  assert.strictEqual(acceptRes.conversationStatus, 'ACTIVE');

  const m1 = await MessageService.sendMessage(e2eRecruiter.id, acceptRes.conversationId!, 'Hi! Can you speak tomorrow?');
  const m2 = await MessageService.sendMessage(registeredDev.id, acceptRes.conversationId!, 'Yes, 2 PM works perfectly!');
  assert(m1.id && m2.id, 'Both participants sent messages successfully');

  console.log('  ✅ Confirmed: Complete E2E flow (register -> test -> submit -> opening -> notify -> approach -> accept -> chat) passed.\n');

  console.log('🎉 ALL TARGET ARCHITECTURE RULES & E2E CHECKS PASSED SUCCESSFULLY!\n');
}

runTargetArchitectureRulesTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failure:', err);
    process.exit(1);
  });
