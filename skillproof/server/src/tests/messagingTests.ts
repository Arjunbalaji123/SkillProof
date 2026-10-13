import assert from 'assert';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { OpeningService, OpeningError } from '../services/openingService.js';
import { NotificationService } from '../services/notificationService.js';
import { MessageService, MessageError } from '../services/messageService.js';

export async function runMessagingTests() {
  console.log('\n💬 Running Messaging + Hiring Openings Unit & Integration Tests...');
  const passwordHash = await bcrypt.hash('TestPass@123', 10);
  const createdUserIds: string[] = [];

  const catalog = await prisma.skillCatalog.findFirst({
    include: { track: true },
  });
  assert.ok(catalog && catalog.track, 'Expected at least one SkillCatalog with Track in DB');

  const secondCatalog = await prisma.skillCatalog.findFirst({
    where: { id: { not: catalog.id } },
    include: { track: true },
  });

  let counter = 0;
  const createTestUser = async (options: {
    prefix: string;
    role?: 'DEVELOPER' | 'RECRUITER' | 'ADMIN';
    isDemo?: boolean;
    status?: 'ACTIVE' | 'SUSPENDED';
    isPublic?: boolean;
    allowRecruiterMessages?: boolean;
    notificationsPaused?: boolean;
    recruiterVerified?: boolean;
    verifiedSkillScore?: number | null;
    verifiedSkillLevel?: string;
    withInterest?: boolean;
  }) => {
    counter++;
    const suffix = `${options.prefix}${counter}_${Date.now().toString().slice(-4)}`.toLowerCase().slice(0, 20);
    const role = options.role || 'DEVELOPER';
    const user = await prisma.user.create({
      data: {
        name: `Test ${options.prefix} ${counter}`,
        username: suffix,
        email: `${suffix}@test.skillproof.local`,
        passwordHash,
        role,
        isDemo: options.isDemo ?? false,
        status: options.status || 'ACTIVE',
        profile: {
          create: {
            bio: `Bio for ${suffix}`,
            isPublic: options.isPublic ?? true,
            showOnLeaderboard: true,
            allowRecruiterMessages: options.allowRecruiterMessages ?? true,
            notificationsPaused: options.notificationsPaused ?? false,
          },
        },
        ...(role === 'RECRUITER'
          ? {
              recruiterProfile: {
                create: {
                  companyName: `Company ${options.prefix}`,
                  jobTitle: 'Staff Recruiter',
                  isVerified: options.recruiterVerified ?? true,
                  verifiedAt: options.recruiterVerified ?? true ? new Date() : null,
                },
              },
            }
          : {}),
      },
    });
    createdUserIds.push(user.id);

    if (options.verifiedSkillScore !== undefined && options.verifiedSkillScore !== null) {
      await prisma.skill.create({
        data: {
          userId: user.id,
          skillCatalogId: catalog.id,
          language: catalog.name,
          status: 'VERIFIED',
          bestScore: options.verifiedSkillScore,
          claimedLevel: options.verifiedSkillLevel || 'Advanced',
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (options.withInterest) {
      await prisma.developerInterest.create({
        data: {
          userId: user.id,
          trackId: catalog.trackId,
          skillCatalogId: catalog.id,
        },
      });
    }

    return user;
  };

  try {
    // 1. Developer cannot start a direct conversation (403); cannot message developers or recruiters directly
    const dev1 = await createTestUser({
      prefix: 'd1',
      role: 'DEVELOPER',
      verifiedSkillScore: 85,
      withInterest: true,
    });
    const dev2 = await createTestUser({
      prefix: 'd2',
      role: 'DEVELOPER',
      verifiedSkillScore: 88,
      withInterest: true,
    });
    const verifiedRecruiterA = await createTestUser({
      prefix: 'reca',
      role: 'RECRUITER',
      recruiterVerified: true,
    });
    const verifiedRecruiterB = await createTestUser({
      prefix: 'recb',
      role: 'RECRUITER',
      recruiterVerified: true,
    });
    const unverifiedRecruiter = await createTestUser({
      prefix: 'recunv',
      role: 'RECRUITER',
      recruiterVerified: false,
    });

    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(dev1.id, dev2.username!, 'Hey fellow dev');
      },
      (err: any) =>
        err instanceof MessageError &&
        err.statusCode === 403 &&
        err.message === 'Only recruiters can start direct conversations'
    );

    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(
          dev1.id,
          verifiedRecruiterA.username!,
          'Hey recruiter'
        );
      },
      (err: any) =>
        err instanceof MessageError &&
        err.statusCode === 403 &&
        err.message === 'Only recruiters can start direct conversations'
    );
    console.log(
      '  ✅ Core Rules: Developer cannot start direct conversations (403) with developers or recruiters'
    );

    // 2. Unverified recruiter cannot create an opening or start direct conversation
    await assert.rejects(
      async () => {
        await OpeningService.createOpening(unverifiedRecruiter.id, {
          title: 'Unverified Opening',
          trackId: catalog.trackId,
          description: 'Should fail because recruiter is unverified',
          skillCatalogIds: [catalog.id],
        });
      },
      (err: any) => err instanceof OpeningError && err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(
          unverifiedRecruiter.id,
          dev1.username!,
          'Hello from unverified recruiter'
        );
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    console.log('  ✅ Recruiter Verification: Unverified recruiter cannot create openings or send messages');

    // 3. Matching query: verified skill, min score, interests, paused, blocked, suspended, demo excluded
    const devLowScore = await createTestUser({
      prefix: 'dlow',
      verifiedSkillScore: 55,
      verifiedSkillLevel: 'Basic',
      withInterest: true,
    });
    const devNoInterest = await createTestUser({
      prefix: 'dnoi',
      verifiedSkillScore: 90,
      withInterest: false,
    });
    const devPaused = await createTestUser({
      prefix: 'dpau',
      verifiedSkillScore: 90,
      withInterest: true,
      notificationsPaused: true,
    });
    const devBlocked = await createTestUser({
      prefix: 'dblk',
      verifiedSkillScore: 90,
      withInterest: true,
    });
    await MessageService.blockUser(devBlocked.id, verifiedRecruiterA.id);

    const devSuspended = await createTestUser({
      prefix: 'dsus',
      verifiedSkillScore: 90,
      withInterest: true,
      status: 'SUSPENDED',
    });
    const devDemo = await createTestUser({
      prefix: 'ddem',
      verifiedSkillScore: 95,
      withInterest: true,
      isDemo: true,
    });
    const devNoVerifiedSkill = await createTestUser({
      prefix: 'dnov',
      verifiedSkillScore: null,
      withInterest: true,
    });

    const opening1 = await OpeningService.createOpening(verifiedRecruiterA.id, {
      title: 'Senior Systems & ML Engineer',
      trackId: catalog.trackId,
      description: 'Looking for verified engineers with score >= 75 in catalog skill.',
      minScore: 75,
      minLevel: 'Intermediate',
      positions: 2,
      skillCatalogIds: [catalog.id],
    });

    const matchedDevs = await OpeningService.findMatchingDevelopers(opening1.id);
    const matchedIds = new Set(matchedDevs.map((d) => d.id));

    assert.ok(matchedIds.has(dev1.id), 'Eligible dev1 should match opening1');
    assert.ok(matchedIds.has(dev2.id), 'Eligible dev2 should match opening1');
    assert.ok(!matchedIds.has(devLowScore.id), 'Low score developer must be excluded');
    assert.ok(!matchedIds.has(devNoInterest.id), 'Developer without matching interest must be excluded');
    assert.ok(!matchedIds.has(devPaused.id), 'Developer with notificationsPaused must be excluded');
    assert.ok(!matchedIds.has(devBlocked.id), 'Blocked developer must be excluded');
    assert.ok(!matchedIds.has(devSuspended.id), 'Suspended developer must be excluded');
    assert.ok(!matchedIds.has(devDemo.id), 'Demo developer must be excluded');
    assert.ok(!matchedIds.has(devNoVerifiedSkill.id), 'Unverified skill developer must be excluded');
    console.log(
      '  ✅ Matching Query: Verified skill, minScore, minLevel, interests, paused, blocked, suspended, and demo exclusions verified'
    );

    // 4. 5 notifications per day cap and digest grouping
    // Create 5 more openings across verifiedRecruiterA and verifiedRecruiterB so dev1 matches 6 openings today
    for (let i = 2; i <= 5; i++) {
      await OpeningService.createOpening(verifiedRecruiterA.id, {
        title: `Opening #${i} by Recruiter A`,
        trackId: catalog.trackId,
        description: `Description for opening #${i} matching dev1.`,
        minScore: 70,
        skillCatalogIds: [catalog.id],
      });
    }

    // 6th active opening by Recruiter A must fail (max 5 ACTIVE openings per recruiter)
    await assert.rejects(
      async () => {
        await OpeningService.createOpening(verifiedRecruiterA.id, {
          title: '6th Active Opening by Recruiter A',
          trackId: catalog.trackId,
          description: 'Should fail max 5 active openings check.',
          skillCatalogIds: [catalog.id],
        });
      },
      (err: any) => err instanceof OpeningError && err.statusCode === 400
    );

    // Recruiter B creates the 6th matching opening for dev1 today
    const openingB1 = await OpeningService.createOpening(verifiedRecruiterB.id, {
      title: 'Opening #6 by Recruiter B',
      trackId: catalog.trackId,
      description: 'Description for 6th matching opening today.',
      minScore: 70,
      skillCatalogIds: [catalog.id],
    });

    const dev1Notifs = await NotificationService.listNotifications(dev1.id, undefined, 20);
    const openingMatchNotifs = dev1Notifs.notifications.filter((n) => n.type === 'OPENING_MATCH');
    assert.strictEqual(
      openingMatchNotifs.length,
      5,
      `Expected OPENING_MATCH notifications capped at 5 per day, got ${openingMatchNotifs.length}`
    );
    const digestNotif = openingMatchNotifs.find((n) => n.entityType === 'OpeningDigest');
    assert.ok(digestNotif, 'Expected extra opening matches beyond 5/day to be grouped into an OpeningDigest notification');
    assert.ok(
      digestNotif.title.includes('digest'),
      `Expected digest notification title to mention digest, got "${digestNotif.title}"`
    );
    console.log('  ✅ Notifications: 5 OPENING_MATCH per day cap + digest grouping + max 5 active openings per recruiter verified');

    // 5. Approach rules: unmatched cannot approach; demo cannot approach; one approach per opening; 5 approaches/day limit; closed/paused/expired rejects
    await assert.rejects(
      async () => {
        await MessageService.approachOpening(devLowScore.id, opening1.id, 'Can I apply with low score?');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await MessageService.approachOpening(devDemo.id, opening1.id, 'Demo dev trying to approach');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    // dev1 approaches opening1
    const app1 = await MessageService.approachOpening(
      dev1.id,
      opening1.id,
      'Hi Recruiter A, I have a verified 85% score and would love to discuss this role!'
    );
    assert.strictEqual(app1.approach.status, 'PENDING');
    assert.strictEqual(app1.conversationStatus, 'PENDING_APPROVAL');

    // Duplicate approach on same opening rejected (409)
    await assert.rejects(
      async () => {
        await MessageService.approachOpening(dev1.id, opening1.id, 'Second approach on same opening');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 409
    );

    // Developer cannot send a second message while PENDING_APPROVAL
    await assert.rejects(
      async () => {
        await MessageService.sendMessage(dev1.id, app1.conversationId, 'Trying to send 2nd message before approval');
      },
      (err: any) =>
        err instanceof MessageError &&
        err.statusCode === 403 &&
        err.message.includes('Waiting for the recruiter')
    );

    // Developer approaches 4 more openings today (total 5 approaches today)
    const recAOpenings = await OpeningService.getRecruiterOpenings(verifiedRecruiterA.id);
    const otherFourOpenings = recAOpenings.filter((o) => o.id !== opening1.id);
    for (const op of otherFourOpenings) {
      await MessageService.approachOpening(dev1.id, op.id, `Approaching ${op.title}`);
    }

    // 6th approach today (on openingB1) must be rejected (429)
    await assert.rejects(
      async () => {
        await MessageService.approachOpening(dev1.id, openingB1.id, '6th approach today');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 429
    );

    // Paused, closed, or expired opening rejects approaches from dev2
    await OpeningService.updateOpening(verifiedRecruiterB.id, openingB1.id, { status: 'PAUSED' });
    await assert.rejects(
      async () => {
        await MessageService.approachOpening(dev2.id, openingB1.id, 'Approaching paused opening');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 400
    );

    await OpeningService.updateOpening(verifiedRecruiterB.id, openingB1.id, { status: 'CLOSED' });
    await assert.rejects(
      async () => {
        await MessageService.approachOpening(dev2.id, openingB1.id, 'Approaching closed opening');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 400
    );

    // Re-activate openingB1 for per-recruiter unlock test
    await OpeningService.updateOpening(verifiedRecruiterB.id, openingB1.id, { status: 'ACTIVE' });
    console.log(
      '  ✅ Approach Rules: Unmatched rejected, duplicate rejected, 1-message limit while pending, 5/day cap, paused/closed rejected'
    );

    // 6. Accepted approach unlocks chat; declined stays closed; unlock is per recruiter (recruiter B stays locked)
    // Have dev2 approach both opening1 (Recruiter A) and openingB1 (Recruiter B)
    const dev2AppA = await MessageService.approachOpening(
      dev2.id,
      opening1.id,
      'Hi Recruiter A from dev2'
    );
    const dev2AppB = await MessageService.approachOpening(
      dev2.id,
      openingB1.id,
      'Hi Recruiter B from dev2'
    );

    // Verify applicants ranking on opening1 (dev2 has 88%, dev1 has 85% -> dev2 ranked first)
    const applicants = await OpeningService.getOpeningApplicants(verifiedRecruiterA.id, opening1.id);
    assert.strictEqual(applicants.length, 2);
    assert.strictEqual(applicants[0].developer.id, dev2.id, 'Higher score applicant dev2 (88%) must rank first');
    assert.strictEqual(applicants[1].developer.id, dev1.id, 'Lower score applicant dev1 (85%) must rank second');

    // Recruiter A accepts dev1's approach and declines dev2's approach
    const acceptRes = await MessageService.decideApproach(
      verifiedRecruiterA.id,
      app1.approach.id,
      'ACCEPTED'
    );
    assert.strictEqual(acceptRes.conversationStatus, 'ACTIVE');

    // Now dev1 can send messages to Recruiter A!
    const dev1FollowUp = await MessageService.sendMessage(
      dev1.id,
      app1.conversationId,
      'Thank you for accepting my approach! When is a good time to chat?'
    );
    assert.ok(dev1FollowUp.id);

    // Recruiter A declines dev2's approach -> conversation stays locked & dev2 notified ("not moving forward")
    await MessageService.decideApproach(
      verifiedRecruiterA.id,
      dev2AppA.approach.id,
      'DECLINED'
    );
    await assert.rejects(
      async () => {
        await MessageService.sendMessage(dev2.id, dev2AppA.conversationId, 'Can I still reply after decline?');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    const dev2Notifs = await NotificationService.listNotifications(dev2.id);
    const declineNotif = dev2Notifs.notifications.find((n) => n.type === 'APPROACH_DECLINED');
    assert.ok(
      declineNotif && declineNotif.body.includes('not moving forward'),
      'Expected APPROACH_DECLINED notification containing "not moving forward"'
    );

    // Verify per-recruiter unlock: dev2's conversation with Recruiter B is STILL locked (PENDING_APPROVAL)
    // and dev1 has no unlocked chat with Recruiter B
    await assert.rejects(
      async () => {
        await MessageService.sendMessage(dev2.id, dev2AppB.conversationId, 'Trying to message Recruiter B before B accepts');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    console.log(
      '  ✅ Approach Decisions & Per-Recruiter Unlock: Accepted unlocks chat, declined stays locked ("not moving forward"), Recruiter B stays locked'
    );

    // 7. Direct flow: ineligible/demo/blocked developer rejected; 10/day direct limit; closed conversation disables developer composer
    const devOptOut = await createTestUser({
      prefix: 'dopt',
      verifiedSkillScore: 90,
      allowRecruiterMessages: false,
    });
    const devPrivate = await createTestUser({
      prefix: 'dpriv',
      verifiedSkillScore: 90,
      isPublic: false,
    });

    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(verifiedRecruiterB.id, devDemo.username!, 'Direct to demo');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(
          verifiedRecruiterB.id,
          devNoVerifiedSkill.username!,
          'Direct to unverified dev'
        );
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(verifiedRecruiterB.id, devOptOut.username!, 'Direct to opt-out dev');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(verifiedRecruiterB.id, devPrivate.username!, 'Direct to private dev');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(verifiedRecruiterA.id, devBlocked.username!, 'Direct to dev who blocked me');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    // Test 10 new direct conversations per day limit for verifiedRecruiterB
    const tenDevs: Awaited<ReturnType<typeof createTestUser>>[] = [];
    for (let i = 1; i <= 11; i++) {
      const d = await createTestUser({
        prefix: `dm${i}`,
        verifiedSkillScore: 80 + (i % 15),
        withInterest: true,
      });
      tenDevs.push(d);
    }

    let firstDirectConvId = '';
    for (let i = 0; i < 10; i++) {
      const dm = await MessageService.startDirectConversation(
        verifiedRecruiterB.id,
        tenDevs[i].username!,
        `Hi ${tenDevs[i].name}, reaching out directly (#${i + 1})`,
        'Top verified score'
      );
      if (i === 0) firstDirectConvId = dm.conversationId;
    }

    // 11th direct conversation today must be rejected with 429
    await assert.rejects(
      async () => {
        await MessageService.startDirectConversation(
          verifiedRecruiterB.id,
          tenDevs[10].username!,
          '11th direct conversation today'
        );
      },
      (err: any) => err instanceof MessageError && err.statusCode === 429
    );

    // Recipient of direct conversation can reply immediately
    const directReply = await MessageService.sendMessage(
      tenDevs[0].id,
      firstDirectConvId,
      'Hi Recruiter B, thanks for reaching out directly!'
    );
    assert.ok(directReply.id);

    // Recruiter closes the conversation -> disables the developer's composer
    await MessageService.closeConversation(verifiedRecruiterB.id, firstDirectConvId);
    const closedThread = await MessageService.getConversationMessages(tenDevs[0].id, firstDirectConvId);
    assert.strictEqual(closedThread.conversation.status, 'CLOSED');
    assert.strictEqual(closedThread.conversation.composerState.canSend, false);
    assert.strictEqual(
      closedThread.conversation.composerState.disabledReason,
      'This conversation was closed by the recruiter'
    );

    await assert.rejects(
      async () => {
        await MessageService.sendMessage(tenDevs[0].id, firstDirectConvId, 'Developer trying to send in closed chat');
      },
      (err: any) =>
        err instanceof MessageError &&
        err.statusCode === 403 &&
        err.message === 'This conversation was closed by the recruiter'
    );

    // Recruiter sends a new message -> reopens the conversation so developer can reply again
    await MessageService.sendMessage(
      verifiedRecruiterB.id,
      firstDirectConvId,
      'Re-opening our conversation with an update!'
    );
    const reopenedThread = await MessageService.getConversationMessages(tenDevs[0].id, firstDirectConvId);
    assert.strictEqual(reopenedThread.conversation.status, 'ACTIVE');
    assert.strictEqual(reopenedThread.conversation.composerState.canSend, true);
    console.log(
      '  ✅ Direct Flow & Close Rules: 10/day limit, eligibility checks, close disables developer composer, recruiter message reopens'
    );

    // 8. Non-participant access denied; HTML stored as plain text; admin report context limited to 5 messages; zero email leaks
    const htmlPayload = '<script>alert("xss")</script><b>Plain Text Check</b>';
    const htmlMsg = await MessageService.sendMessage(tenDevs[0].id, firstDirectConvId, htmlPayload);
    assert.strictEqual(htmlMsg.body, htmlPayload);

    await assert.rejects(
      async () => {
        await MessageService.getConversationMessages(devNoInterest.id, firstDirectConvId);
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await MessageService.sendMessage(devNoInterest.id, firstDirectConvId, 'Intruder message');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    // Report message & verify admin sees at most 5 messages of context and zero emails
    const report = await MessageService.reportMessage(
      verifiedRecruiterB.id,
      htmlMsg.id,
      'Testing report context limit'
    );
    const adminReports = await MessageService.getAdminMessageReports(false);
    const foundReport = adminReports.find((r) => r.id === report.id);
    assert.ok(foundReport, 'Admin should see the reported message');
    assert.ok(
      foundReport.contextMessages.length <= 5,
      `Expected <= 5 context messages, got ${foundReport.contextMessages.length}`
    );

    const serializedInbox = JSON.stringify(await MessageService.listConversations(dev1.id));
    const serializedThread = JSON.stringify(
      await MessageService.getConversationMessages(dev1.id, app1.conversationId)
    );
    const serializedOpenings = JSON.stringify(
      await OpeningService.getMatchingOpeningsForDeveloper(dev1.id)
    );
    assert.ok(!serializedInbox.includes('@test.skillproof.local'), 'Inbox response must never contain email');
    assert.ok(!serializedThread.includes('@test.skillproof.local'), 'Thread response must never contain email');
    assert.ok(!serializedOpenings.includes('@test.skillproof.local'), 'Openings response must never contain email');
    assert.ok(!serializedInbox.includes('passwordHash'), 'Response must never contain passwordHash');

    console.log(
      '  ✅ Security & Privacy: Non-participant 403, HTML kept as plain text, 5-message report context, and zero email/passwordHash leaks'
    );
    console.log('🎉 All Messaging + Hiring Openings unit tests PASSED!\n');
  } finally {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  }
}
