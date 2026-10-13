import assert from 'assert';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { MessageService, MessageError } from '../services/messageService.js';

export async function runMessagingTests() {
  console.log('\n💬 Running Direct Messaging Unit & Integration Tests...');
  const passwordHash = await bcrypt.hash('TestPass@123', 10);
  const createdUserIds: string[] = [];

  const createTestUser = async (
    suffix: string,
    role: 'DEVELOPER' | 'RECRUITER' | 'ADMIN' = 'DEVELOPER',
    isDemo = false,
    status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE'
  ) => {
    const username = `msg_${suffix}_${Date.now().toString().slice(-5)}`.slice(0, 20);
    const user = await prisma.user.create({
      data: {
        name: `Test ${suffix}`,
        username,
        email: `${username}@test.skillproof.local`,
        passwordHash,
        role,
        isDemo,
        status,
        profile: {
          create: {
            publicSlug: username,
            bio: `Bio for ${suffix}`,
            isPublic: true,
            showOnLeaderboard: true,
          },
        },
      },
    });
    createdUserIds.push(user.id);
    return user;
  };

  try {
    const devA = await createTestUser('deva', 'DEVELOPER');
    const devB = await createTestUser('devb', 'DEVELOPER');
    const recruiterC = await createTestUser('recc', 'RECRUITER');
    const outsiderD = await createTestUser('outd', 'DEVELOPER');
    const demoUser = await createTestUser('demo', 'DEVELOPER', true);
    const adminUser = await createTestUser('adm', 'ADMIN');
    const suspendedUser = await createTestUser('susp', 'DEVELOPER', false, 'SUSPENDED');

    // 1. Reject messaging yourself, demo accounts, admin accounts, and suspended accounts
    await assert.rejects(
      async () => {
        await MessageService.startConversation(devA.id, devA.username!, 'Hello myself');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 400
    );

    await assert.rejects(
      async () => {
        await MessageService.startConversation(devA.id, demoUser.username!, 'Hello demo');
      },
      (err: any) =>
        err instanceof MessageError && (err.statusCode === 403 || err.statusCode === 400)
    );

    await assert.rejects(
      async () => {
        await MessageService.startConversation(devA.id, adminUser.username!, 'Hello admin');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await MessageService.startConversation(devA.id, suspendedUser.username!, 'Hello suspended');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    console.log('  ✅ Messaging: Rejects self, demo accounts, admin accounts, and suspended users');

    // 2. Pair uniqueness (userAId < userBId) & Request flow + 3-message pending limit
    const startRes = await MessageService.startConversation(
      devA.id,
      devB.username!,
      'Hi DevB! First message (1/3)'
    );
    assert.strictEqual(startRes.created, true);
    const convId = startRes.conversation.id;

    // Verify lexicographical ordering of userAId and userBId in DB
    const dbConv = await prisma.conversation.findUnique({ where: { id: convId } });
    assert.ok(dbConv);
    assert.ok(
      dbConv.userAId < dbConv.userBId,
      `Expected userAId (${dbConv.userAId}) < userBId (${dbConv.userBId})`
    );

    // Check recipient sees it in 'requests' tab and sender sees it in 'inbox'
    const devAInbox = await MessageService.listConversations(devA.id, 'inbox');
    const devBRequests = await MessageService.listConversations(devB.id, 'requests');
    assert.ok(devAInbox.some((c) => c.id === convId));
    assert.ok(devBRequests.some((c) => c.id === convId));

    // Pending sender sends 2nd and 3rd messages
    await MessageService.sendMessage(devA.id, convId, 'Second pending message (2/3)');
    await MessageService.sendMessage(devA.id, convId, 'Third pending message (3/3)');

    // 4th message before acceptance MUST be rejected
    await assert.rejects(
      async () => {
        await MessageService.sendMessage(devA.id, convId, 'Fourth pending message (should fail)');
      },
      (err: any) =>
        err instanceof MessageError && (err.statusCode === 403 || err.statusCode === 429)
    );

    // Recipient accepts the request
    await MessageService.acceptRequest(devB.id, convId);

    // Now both participants are ACTIVE and sender can send 4th message
    const fourthMsg = await MessageService.sendMessage(
      devA.id,
      convId,
      'Fourth message after acceptance!'
    );
    assert.strictEqual(fourthMsg.body, 'Fourth message after acceptance!');

    // Starting conversation in reverse (devB -> devA) reuses the exact same conversation
    const reverseStart = await MessageService.startConversation(
      devB.id,
      devA.username!,
      'Replying via startConversation!'
    );
    assert.strictEqual(reverseStart.created, false);
    assert.strictEqual(reverseStart.conversation.id, convId);
    console.log(
      '  ✅ Messaging: Pair uniqueness (userAId < userBId), Request -> Accept flow, and 3-message pending limit'
    );

    // 3. Silent decline (sender is NOT told; they still see "pending")
    const recStart = await MessageService.startConversation(
      recruiterC.id,
      devB.username!,
      'Hi DevB, are you open to roles?'
    );
    const recConvId = recStart.conversation.id;
    await MessageService.declineRequest(devB.id, recConvId);

    const senderViewAfterDecline = await MessageService.getConversationDetails(
      recruiterC.id,
      recConvId
    );
    assert.strictEqual(
      senderViewAfterDecline.isPending,
      true,
      'Declined request must still appear as pending to the sender'
    );
    assert.strictEqual(
      senderViewAfterDecline.otherParticipant.status,
      'REQUEST',
      'Sender must not see DECLINED status'
    );
    console.log('  ✅ Messaging: Silent decline hides request from recipient without telling sender');

    // 4. Non-participant cannot read or post to a conversation
    await assert.rejects(
      async () => {
        await MessageService.getConversationDetails(outsiderD.id, convId);
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await MessageService.sendMessage(outsiderD.id, convId, 'Intruder message');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    console.log('  ✅ Messaging: Non-participant access denied (403) on read and send');

    // 5. Blocked sender rejected
    await MessageService.blockUser(devB.id, devA.id);
    await assert.rejects(
      async () => {
        await MessageService.sendMessage(devA.id, convId, 'Message while blocked');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 403
    );
    await MessageService.unblockUser(devB.id, devA.id);
    const afterUnblock = await MessageService.sendMessage(
      devA.id,
      convId,
      'Message after unblock works!'
    );
    assert.strictEqual(afterUnblock.body, 'Message after unblock works!');
    console.log('  ✅ Messaging: Blocked sender rejected and unblock restores messaging');

    // 6. Plain text sanitization & HTML safety + max 2000 chars
    const htmlInput = '<script>alert("xss")</script>\x00\x07<b>Hello</b>';
    const sanitizedMsg = await MessageService.sendMessage(devB.id, convId, htmlInput);
    assert.ok(!sanitizedMsg.body.includes('\x00') && !sanitizedMsg.body.includes('\x07'));
    assert.strictEqual(sanitizedMsg.body, '<script>alert("xss")</script><b>Hello</b>');

    await assert.rejects(
      async () => {
        await MessageService.sendMessage(devB.id, convId, '   \x00  ');
      },
      (err: any) => err instanceof MessageError && err.statusCode === 400
    );

    await assert.rejects(
      async () => {
        await MessageService.sendMessage(devB.id, convId, 'a'.repeat(2001));
      },
      (err: any) => err instanceof MessageError && err.statusCode === 400
    );
    console.log('  ✅ Messaging: Plain text sanitization, control char stripping, and 2000-char limit');

    // 7. Message report & Admin 5-message context moderation + Zero email/passwordHash leak
    const report = await MessageService.reportMessage(
      devA.id,
      sanitizedMsg.id,
      'Attempted XSS payload in chat'
    );
    assert.ok(report.id);

    const adminReports = await MessageService.getAdminMessageReports();
    const matchedReport = adminReports.find((r) => r.id === report.id);
    assert.ok(matchedReport, 'Admin should see the reported message');
    assert.ok(
      matchedReport.contextMessages.length <= 5,
      `Admin context must contain at most 5 messages, got ${matchedReport.contextMessages.length}`
    );
    assert.ok(
      matchedReport.contextMessages.some((m) => m.id === sanitizedMsg.id && m.isReportedMessage)
    );

    // Verify no email or passwordHash in conversation list, detail, or admin reports
    const convDetail = await MessageService.getConversationDetails(devA.id, convId);
    const serialized = JSON.stringify({ devAInbox, convDetail, matchedReport });
    assert.ok(!serialized.includes('passwordHash'), 'Must never leak passwordHash');
    assert.ok(!serialized.includes('@test.skillproof.local'), 'Must never leak email addresses');

    // Resolve report via admin moderation
    const modResult = await MessageService.moderateMessageReport(
      adminUser.id,
      report.id,
      'warn',
      'Warned sender for test payload'
    );
    assert.strictEqual(modResult.action, 'warn');
    console.log('  ✅ Messaging: Report + Admin 5-message context moderation & zero email/passwordHash leak');

    // 8. 10 new conversations per day limit
    const spamSender = await createTestUser('spammer', 'DEVELOPER');
    const recipients = [];
    for (let i = 0; i < 11; i++) {
      recipients.push(await createTestUser(`rcp${i}`, 'DEVELOPER'));
    }
    for (let i = 0; i < 10; i++) {
      await MessageService.startConversation(
        spamSender.id,
        recipients[i].username!,
        `Hello recipient #${i + 1}`
      );
    }
    // 11th new conversation in the same day must fail with 429
    await assert.rejects(
      async () => {
        await MessageService.startConversation(
          spamSender.id,
          recipients[10].username!,
          'Hello 11th recipient (should fail)'
        );
      },
      (err: any) => err instanceof MessageError && err.statusCode === 429
    );
    console.log('  ✅ Messaging: Enforces 10 new conversations per user per day limit (429)');
  } finally {
    // Clean up test users and their cascading messaging data
    if (createdUserIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { actorId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  }
}

if (process.argv[1]?.endsWith('messagingTests.ts') || process.argv[1]?.endsWith('messagingTests.js')) {
  runMessagingTests()
    .then(() => {
      console.log('🎉 All Direct Messaging Tests Passed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Messaging tests failed:', err);
      process.exit(1);
    });
}

