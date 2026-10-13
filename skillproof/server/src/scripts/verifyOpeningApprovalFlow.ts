import { PrismaClient } from '@prisma/client';
import { httpServer } from '../app.js';

const prisma = new PrismaClient();
let API_BASE = '';

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

async function loginUser(email: string, password = 'Password123!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  const tokenCookie = setCookie ? setCookie.split(';')[0] : '';
  const data = await res.json().catch(() => null);
  const token = data?.data?.token || '';
  return {
    status: res.status,
    user: data?.data?.user,
    token,
    cookie: tokenCookie,
    headers: {
      Cookie: tokenCookie,
      Authorization: `Bearer ${token}`,
    },
  };
}

async function main() {
  console.log('🧪 Starting End-to-End Verification of Opening Review & Approval Flow...\n');

  const server = httpServer.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as any).port;
  API_BASE = `http://127.0.0.1:${port}/api`;
  console.log(`📡 In-process test server active at ${API_BASE}\n`);

  let passes = 0;
  let fails = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passes++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      fails++;
    }
  }

  let createdOpeningId: string | null = null;

  try {
    // ==========================================
    // 1. Authenticate Users
    // ==========================================
    console.log('1️⃣  Authenticating Admin, Recruiter, and Developer...');
    const adminLogin = await loginUser('admin@skillproof.dev', 'Admin@123');
    assert(adminLogin.status === 200, 'Admin logged in (admin@skillproof.dev)');
    assert(adminLogin.user?.role === 'ADMIN', 'Admin role verified');

    const recLogin = await loginUser('recruiter01@seed.skillproof.test', 'Password123!');
    assert(recLogin.status === 200, 'Recruiter01 logged in');
    assert(recLogin.user?.role === 'RECRUITER', 'Recruiter01 role verified');

    const devLogin = await loginUser('dev_a_mv6k0118@cit.edu.in', 'Password123!');
    assert(devLogin.status === 200, 'Developer (dev_a_mv6k0118) logged in');
    assert(devLogin.user?.role === 'DEVELOPER', 'Developer role verified');

    // ==========================================
    // 2. Recruiter Creates Opening -> PENDING_REVIEW & No Dev Notifications
    // ==========================================
    console.log('\n2️⃣  Recruiter Creates Opening...');
    const jsSkill = await prisma.skillCatalog.findFirst({
      where: { name: 'JavaScript' },
      include: { track: true },
    });
    assert(!!jsSkill, 'Found JavaScript skill catalog entry');

    const trackId = jsSkill!.trackId;
    const initialDevNotificationsCount = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH' },
    });

    const createRes = await request('/openings', {
      method: 'POST',
      headers: recLogin.headers,
      body: JSON.stringify({
        title: 'Senior Frontend Architect (E2E Test)',
        trackId: trackId,
        description: 'Lead frontend engineering using modern JS and React architectures.',
        minLevel: 'Intermediate',
        minScore: 75,
        skillCatalogIds: [jsSkill!.id],
        positions: 2,
      }),
    });

    assert(createRes.status === 201, `POST /api/openings returned 201 (got ${createRes.status})`);
    const createdOpening = createRes.data?.data;
    createdOpeningId = createdOpening?.id;
    assert(!!createdOpeningId, 'Opening created with CUID');
    assert(createdOpening?.status === 'PENDING_REVIEW', 'Opening status is PENDING_REVIEW upon creation');
    assert(createdOpening?.reviewedBy === null, 'reviewedBy is null upon creation');
    assert(createdOpening?.reviewedAt === null, 'reviewedAt is null upon creation');
    assert(createdOpening?.notifiedAt === null, 'notifiedAt is null upon creation');

    // Confirm that NO developer notifications were dispatched
    const devNotificationsAfterCreate = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH' },
    });
    assert(
      devNotificationsAfterCreate === initialDevNotificationsCount,
      'Zero developer notifications sent upon recruiter creation (notified ONLY upon admin approval)'
    );

    // ==========================================
    // 3. Visibility Restrictions on PENDING_REVIEW Opening
    // ==========================================
    console.log('\n3️⃣  Testing Visibility & Approach Restrictions for Developers...');
    
    // Developer matches endpoint must NOT include the pending opening
    const devMatchesRes = await request('/openings/matches', {
      headers: devLogin.headers,
    });
    assert(devMatchesRes.status === 200, 'GET /api/openings/matches returned 200');
    const matchedOpenings = devMatchesRes.data?.data || [];
    const isPendingInMatches = matchedOpenings.some((o: any) => o.id === createdOpeningId);
    assert(!isPendingInMatches, 'PENDING_REVIEW opening is hidden from developer match list');

    // Developer direct fetch must return 404
    const devGetDetails = await request(`/openings/${createdOpeningId}`, {
      headers: devLogin.headers,
    });
    assert(devGetDetails.status === 404, 'GET /api/openings/:id returns 404 for developer when pending review');

    // Developer direct approach must return 403 Forbidden
    const devApproach = await request(`/openings/${createdOpeningId}/approach`, {
      method: 'POST',
      headers: devLogin.headers,
      body: JSON.stringify({ message: 'I would love to apply for this pending position!' }),
    });
    assert(devApproach.status === 403, 'POST /api/openings/:id/approach returns 403 Forbidden for pending opening');

    // ==========================================
    // 4. Access Control & Validation on Admin Review Endpoint
    // ==========================================
    console.log('\n4️⃣  Testing Admin Review Access Control & Validation...');
    
    // Non-admin (developer) attempt to review
    const devReviewAttempt = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: devLogin.headers,
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    assert(devReviewAttempt.status === 403, 'Developer review attempt returns 403 Forbidden');

    // Non-admin (recruiter) attempt to review
    const recReviewAttempt = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: recLogin.headers,
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    assert(recReviewAttempt.status === 403, 'Recruiter review attempt returns 403 Forbidden');

    // Admin rejects without reason -> must fail 400
    const adminRejectNoReason = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: adminLogin.headers,
      body: JSON.stringify({ decision: 'REJECT' }),
    });
    assert(adminRejectNoReason.status === 400, 'Admin rejection without reason returns 400 Bad Request');

    // Admin rejects with too short reason (< 3 chars) -> must fail 400
    const adminRejectShortReason = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: adminLogin.headers,
      body: JSON.stringify({ decision: 'REJECT', reason: 'no' }),
    });
    assert(adminRejectShortReason.status === 400, 'Admin rejection with <3 chars reason returns 400 Bad Request');

    // ==========================================
    // 5. Admin Rejection Flow & Recruiter Alert
    // ==========================================
    console.log('\n5️⃣  Testing Admin Rejection Flow...');
    const rejectReasonText = 'Please provide more details regarding remote timezone requirements and daily expectations.';
    const adminRejectValid = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: adminLogin.headers,
      body: JSON.stringify({ decision: 'REJECT', reason: rejectReasonText }),
    });
    assert(adminRejectValid.status === 200, 'Admin rejection with valid reason returns 200');
    assert(adminRejectValid.data?.data?.status === 'REJECTED', 'Opening status updated to REJECTED');
    assert(adminRejectValid.data?.data?.rejectionReason === rejectReasonText, 'rejectionReason stored on opening');

    // Recruiter notification check
    const recruiterNotifications = await prisma.notification.findMany({
      where: { userId: recLogin.user.id, type: 'SYSTEM' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    const rejectNotif = recruiterNotifications.find((n) => n.body.includes(rejectReasonText));
    assert(!!rejectNotif, 'Recruiter received notification containing the exact rejection reason');

    // Audit log check
    const rejectAudit = await prisma.auditLog.findFirst({
      where: { action: 'OPENING_REJECTED', entityId: createdOpeningId },
    });
    assert(!!rejectAudit, 'Audit log recorded OPENING_REJECTED event');

    // ==========================================
    // 6. Recruiter Resubmission / Edit
    // ==========================================
    console.log('\n6️⃣  Recruiter Resubmission...');
    const resubmitRes = await request(`/openings/${createdOpeningId}`, {
      method: 'PATCH',
      headers: recLogin.headers,
      body: JSON.stringify({
        description: 'Lead frontend engineering across UTC+5:30 to UTC+1 timezones with modern JS, React, and robust test suites.',
      }),
    });
    assert(resubmitRes.status === 200, 'Recruiter update returns 200');
    assert(resubmitRes.data?.data?.status === 'PENDING_REVIEW', 'Editing rejected opening resets status to PENDING_REVIEW');
    assert(resubmitRes.data?.data?.rejectionReason === null, 'rejectionReason cleared on resubmit');

    // ==========================================
    // 7. Admin Openings Queue & Match Count Reach
    // ==========================================
    console.log('\n7️⃣  Checking Admin Console Queue & Potential Match Reach...');
    const adminOpeningsListRes = await request('/admin/openings', {
      headers: adminLogin.headers,
    });
    assert(adminOpeningsListRes.status === 200, 'GET /api/admin/openings returns 200');
    const adminOpeningsList = adminOpeningsListRes.data?.data || [];
    const queuedOpening = adminOpeningsList.find((o: any) => o.id === createdOpeningId);
    assert(!!queuedOpening, 'Pending opening appears in admin openings queue');
    assert(
      queuedOpening?.potentialMatchCount >= 1,
      `potentialMatchCount computed via pure DB query (found ${queuedOpening?.potentialMatchCount} matches)`
    );

    // ==========================================
    // 8. Admin Approval & Developer Notification
    // ==========================================
    console.log('\n8️⃣  Admin Approves Opening & Dispatches Notifications...');
    const devNotifCountBeforeApproval = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH' },
    });

    const approveRes = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: adminLogin.headers,
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    assert(approveRes.status === 200, 'Admin approve returns 200');
    const approvedData = approveRes.data?.data;
    assert(approvedData?.status === 'ACTIVE', 'Opening status updated to ACTIVE');
    assert(approvedData?.reviewedBy === adminLogin.user.id, 'reviewedBy set to admin ID');
    assert(!!approvedData?.reviewedAt, 'reviewedAt timestamp set');
    assert(!!approvedData?.notifiedAt, 'notifiedAt timestamp set upon first approval');

    // Developer notification verification
    const devNotifCountAfterApproval = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH' },
    });
    const devLatestNotif = await prisma.notification.findFirst({
      where: { userId: devLogin.user.id, entityId: createdOpeningId, type: 'OPENING_MATCH' },
    });
    assert(!!devLatestNotif, 'Developer notification created or updated with entityType=opening and entityId matching opening');
    
    const isDigest = devLatestNotif?.title.toLowerCase().includes('digest');
    if (isDigest) {
      assert(
        devLatestNotif?.body.includes('Senior Frontend Architect') && devLatestNotif?.body.includes('Northwind Labs'),
        `Digest notification body correctly references opening and company (${devLatestNotif?.body})`
      );
      assert(
        devLatestNotif?.title.includes('digest'),
        `Digest notification title mentions digest grouping (${devLatestNotif?.title})`
      );
    } else {
      assert(
        devLatestNotif?.title.includes('is hiring:'),
        `Notification title has "<Company> is hiring: <Title>" format (${devLatestNotif?.title})`
      );
      assert(
        devLatestNotif?.body.includes('JavaScript') || devLatestNotif?.body.includes('%'),
        `Notification body includes matched skill and verified score (${devLatestNotif?.body})`
      );
    }

    // Recruiter approval alert
    const recruiterApproveNotif = await prisma.notification.findFirst({
      where: {
        userId: recLogin.user.id,
        entityId: createdOpeningId,
        title: { contains: 'Opening Approved' },
      },
    });
    assert(!!recruiterApproveNotif, 'Recruiter received approval confirmation notification');

    // Audit log check
    const approveAudit = await prisma.auditLog.findFirst({
      where: { action: 'OPENING_APPROVED', entityId: createdOpeningId },
    });
    assert(!!approveAudit, 'Audit log recorded OPENING_APPROVED event');

    // ==========================================
    // 9. Re-Approval Idempotency (No Duplicate Notifications)
    // ==========================================
    console.log('\n9️⃣  Testing Re-Approval Idempotency...');
    const devNotifsBeforeReApprove = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH', entityId: createdOpeningId },
    });

    const reApproveRes = await request(`/admin/openings/${createdOpeningId}/review`, {
      method: 'PATCH',
      headers: adminLogin.headers,
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    assert(reApproveRes.status === 200, 'Re-approving returns 200');

    const devNotifsAfterReApprove = await prisma.notification.count({
      where: { userId: devLogin.user.id, type: 'OPENING_MATCH', entityId: createdOpeningId },
    });
    assert(
      devNotifsAfterReApprove === devNotifsBeforeReApprove,
      'Re-approving does NOT dispatch duplicate notifications (guarded by notifiedAt)'
    );

    // ==========================================
    // 10. Material vs Non-Material Edit Rules on Active Opening
    // ==========================================
    console.log('\n🔟 Testing Material vs Non-Material Edit Rules on Active Opening...');
    
    // Non-material edit: updating positions or title
    const nonMaterialEdit = await request(`/openings/${createdOpeningId}`, {
      method: 'PATCH',
      headers: recLogin.headers,
      body: JSON.stringify({ positions: 4 }),
    });
    assert(nonMaterialEdit.status === 200, 'PATCH non-material edit returns 200');
    assert(nonMaterialEdit.data?.data?.status === 'ACTIVE', 'Positions edit preserves ACTIVE status');

    // Material edit: changing skills, minScore, track, or description
    const materialEdit = await request(`/openings/${createdOpeningId}`, {
      method: 'PATCH',
      headers: recLogin.headers,
      body: JSON.stringify({ minScore: 80 }),
    });
    assert(materialEdit.status === 200, 'PATCH material edit (minScore) returns 200');
    assert(
      materialEdit.data?.data?.status === 'PENDING_REVIEW',
      'Material edit reverts ACTIVE opening back to PENDING_REVIEW'
    );

    // ==========================================
    // 11. Sensitive Data Leak Prevention
    // ==========================================
    console.log('\n1️⃣1️⃣  Auditing for Sensitive Data Leaks...');
    const openingDetails = await prisma.opening.findUnique({
      where: { id: createdOpeningId },
      include: { recruiter: true },
    });
    const stringifiedResponse = JSON.stringify(approveRes.data);
    assert(!stringifiedResponse.includes('passwordHash'), 'No passwordHash in approval API response');
    assert(!stringifiedResponse.includes('$2b$'), 'No bcrypt password hash substrings in API response');

    // Check real accounts remain untouched
    const realUser = await prisma.user.findUnique({
      where: { email: '2403717672621008@cit.edu.in' },
    });
    assert(!!realUser, 'Real user 2403717672621008@cit.edu.in remains untouched');
    assert(realUser?.isSeed === false, 'Real user isSeed flag remains false');

  } finally {
    // ==========================================
    // 12. Cleanup Temporary Test Records
    // ==========================================
    if (createdOpeningId) {
      console.log('\n🧹 Cleaning up test opening and associated records...');
      await prisma.notification.deleteMany({
        where: { entityId: createdOpeningId },
      });
      await prisma.auditLog.deleteMany({
        where: { entityId: createdOpeningId },
      });
      await prisma.openingSkill.deleteMany({
        where: { openingId: createdOpeningId },
      });
      await prisma.opening.delete({
        where: { id: createdOpeningId },
      });
      console.log('  Cleaned up test opening successfully.');
    }
    await prisma.$disconnect();
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`🎉 TEST SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log(`========================================\n`);

  if (fails > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
