import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

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
  console.log('🧪 Starting live API verification of Recruiter Ecosystem...\n');

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

  // 1. Verify Real Accounts Unchanged
  console.log('1️⃣  Auditing Real User Accounts...');
  const arjunUser = await prisma.user.findUnique({
    where: { email: '2403717672621008@cit.edu.in' },
    include: { skills: true, interests: true },
  });
  assert(!!arjunUser, 'Real user 2403717672621008@cit.edu.in exists in DB');
  assert(arjunUser?.isSeed === false, 'Real user isSeed flag is false');
  assert(arjunUser?.skills.length === 0, 'Real user skills remain strictly unpolluted');

  // 2. Test Recruiter Logins & Permissions
  console.log('\n2️⃣  Testing Recruiter Authentication & Opening Management...');
  const rec01Login = await loginUser('recruiter01@seed.skillproof.test');
  assert(rec01Login.status === 200, 'Recruiter01 logged in successfully');
  assert(rec01Login.user?.role === 'RECRUITER', 'Recruiter01 role is RECRUITER');
  assert(!('passwordHash' in (rec01Login.user || {})), 'No passwordHash leaked in recruiter login response');

  // Recruiter openings manage endpoint
  const rec01OpeningsRes = await request('/openings/mine', {
    headers: rec01Login.headers,
  });
  assert(rec01OpeningsRes.status === 200, 'GET /api/openings/mine returns 200');
  const rec01Openings = rec01OpeningsRes.data?.data || [];
  assert(rec01Openings.length === 4, `Recruiter01 has exactly 4 openings (found ${rec01Openings.length})`);
  const activeCount = rec01Openings.filter((o: any) => o.status === 'ACTIVE').length;
  const pausedCount = rec01Openings.filter((o: any) => o.status === 'PAUSED').length;
  assert(activeCount === 3, `Recruiter01 has 3 ACTIVE openings (found ${activeCount})`);
  assert(pausedCount === 1, `Recruiter01 has 1 PAUSED opening (found ${pausedCount})`);

  // Unverified Recruiter Pending Check
  const rec11Login = await loginUser('recruiter11@seed.skillproof.test');
  assert(rec11Login.status === 200, 'Unverified Recruiter11 logged in successfully');
  assert(rec11Login.user?.recruiterProfile?.isVerified === false, 'Recruiter11 isVerified is false');

  const tracks = await prisma.track.findMany();
  const catalog = await prisma.skillCatalog.findFirst();
  const tryCreate = await request('/openings', {
    method: 'POST',
    headers: rec11Login.headers,
    body: JSON.stringify({
      title: 'Should Fail Opening',
      trackId: tracks[0].id,
      description: 'This opening creation should be refused by OpeningService because recruiter is unverified.',
      skillCatalogIds: [catalog!.id],
    }),
  });
  assert(tryCreate.status === 403, `Unverified recruiter blocked from creating openings (status ${tryCreate.status})`);
  assert(
    tryCreate.data?.message?.includes('pending approval'),
    'Correct "pending approval" error message returned'
  );

  // 3. Test Developer Matching & Openings Discovery
  console.log('\n3️⃣  Testing Developer Matching & Openings Discovery...');
  const devAlphaLogin = await loginUser('dev_alpha@seed.skillproof.test');
  assert(devAlphaLogin.status === 200, 'Dev_alpha logged in successfully');
  assert(devAlphaLogin.user?.role === 'DEVELOPER', 'Dev_alpha role is DEVELOPER');

  const matchesRes = await request('/openings/matches', {
    headers: devAlphaLogin.headers,
  });
  assert(matchesRes.status === 200, 'GET /api/openings/matches returns 200');
  const matchedOpenings = matchesRes.data?.data || [];
  assert(matchedOpenings.length > 0, `Dev_alpha matched ${matchedOpenings.length} openings in the system`);

  // Check matching tags on returned opening
  const matchedWithReason = matchedOpenings.find((o: any) => o.title.includes('React'));
  assert(!!matchedWithReason, 'Found matching React opening in Developer Openings feed');
  assert(
    matchedWithReason?.isEligibleToApproach !== undefined,
    'Returned opening includes isEligibleToApproach field'
  );

  // 4. Test Submitting a New Live Approach through the API
  console.log('\n4️⃣  Testing Live Approach Submission & Recruiter Inbox...');
  // Find an active opening dev_alpha is eligible to approach
  const eligibleOpening = matchedOpenings.find(
    (o: any) => o.isEligibleToApproach && o.status === 'ACTIVE'
  );
  assert(!!eligibleOpening, `Found eligible opening to approach: "${eligibleOpening?.title}"`);

  if (eligibleOpening) {
    const approachRes = await request(`/openings/${eligibleOpening.id}/approach`, {
      method: 'POST',
      headers: devAlphaLogin.headers,
      body: JSON.stringify({
        message: 'Hello! I am excited to apply for this role through the SkillProof platform.',
      }),
    });
    assert(
      approachRes.status === 201 || approachRes.status === 200,
      `POST /api/openings/:id/approach returns 201 Created (created approach ${approachRes.data?.data?.approach?.id})`
    );

    // Verify it is visible in the opening applicants
    const recruiterOwner = await prisma.user.findUnique({
      where: { id: eligibleOpening.recruiter.id },
    });
    const recOwnerLogin = await loginUser(recruiterOwner!.email);
    const applicantsRes = await request(`/openings/${eligibleOpening.id}/applicants`, {
      headers: recOwnerLogin.headers,
    });
    assert(applicantsRes.status === 200, 'GET /api/openings/:id/applicants returns 200');
    const applicants = applicantsRes.data?.data || [];
    const foundApplicant = applicants.find((a: any) => a.developerId === devAlphaLogin.user.id);
    assert(!!foundApplicant, "Dev_alpha's new approach is visible in recruiter's opening applicants!");

    // Test Dev-Only Auto-Responder (10s delay)
    console.log('\n⏱️  Testing Dev-Only Recruiter Auto-Responder (10s timer)...');
    console.log('   Waiting 11 seconds for auto-responder to accept and reply...');
    await new Promise((resolve) => setTimeout(resolve, 11000));

    const updatedApplicant = await prisma.approach.findUnique({
      where: { id: approachRes.data?.data?.approach?.id },
    });
    assert(
      updatedApplicant?.status === 'ACCEPTED',
      `Auto-responder updated approach status to ACCEPTED (current: ${updatedApplicant?.status})`
    );

    const autoReplyConv = await prisma.conversation.findFirst({
      where: {
        recruiterId: eligibleOpening.recruiter.id,
        developerId: devAlphaLogin.user.id,
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    });
    const latestMessage = autoReplyConv?.messages[0];
    assert(
      latestMessage?.body === "Thanks for reaching out! Let's talk.",
      `Auto-responder sent canned message: "${latestMessage?.body}"`
    );
  }

  // 5. Test Unread Badges Counters
  console.log('\n5️⃣  Testing Unread Badges Counters...');
  const devAlphaUnreadMsg = await request('/messages/unread-count', {
    headers: devAlphaLogin.headers,
  });
  assert(devAlphaUnreadMsg.status === 200, 'GET /api/messages/unread-count returns 200 for dev_alpha');
  assert(typeof devAlphaUnreadMsg.data?.data?.count === 'number', `Dev_alpha unread messages count is ${devAlphaUnreadMsg.data?.data?.count}`);

  const rec03Login = await loginUser('recruiter03@seed.skillproof.test');
  const rec03UnreadMsg = await request('/messages/unread-count', {
    headers: rec03Login.headers,
  });
  assert(rec03UnreadMsg.status === 200, 'GET /api/messages/unread-count returns 200 for recruiter03');
  assert(typeof rec03UnreadMsg.data?.data?.count === 'number', `Recruiter03 unread messages count is ${rec03UnreadMsg.data?.data?.count}`);

  const devAlphaUnreadNotif = await request('/notifications/unread-count', {
    headers: devAlphaLogin.headers,
  });
  assert(devAlphaUnreadNotif.status === 200, 'GET /api/notifications/unread-count returns 200 for dev_alpha');
  assert(devAlphaUnreadNotif.data?.data?.count > 0, `Dev_alpha has ${devAlphaUnreadNotif.data?.data?.count} unread match notifications`);

  // 6. Security & Data Leak Audit
  console.log('\n6️⃣  Auditing Zero Leaks of PasswordHash and Email in Public APIs...');
  const sampleEndpoints = [
    { name: 'Developer Matches', res: matchesRes },
    { name: 'Recruiter Openings', res: rec01OpeningsRes },
  ];

  for (const item of sampleEndpoints) {
    const jsonStr = JSON.stringify(item.res.data);
    assert(!jsonStr.includes('passwordHash'), `No passwordHash in ${item.name} API response`);
  }

  // Check public recruiter profile
  const publicRecRes = await request('/recruiters/recruiter01', {
    headers: devAlphaLogin.headers,
  });
  assert(publicRecRes.status === 200, 'GET /api/recruiters/recruiter01 returns 200');
  const pubRecStr = JSON.stringify(publicRecRes.data);
  assert(!pubRecStr.includes('passwordHash'), 'No passwordHash in public recruiter profile response');
  assert(!pubRecStr.includes('@seed.skillproof.test'), 'No email leaked in public recruiter profile response');

  console.log('\n================================================================================');
  console.log(`🎯 VERIFICATION COMPLETE: ${passes} PASSED, ${fails} FAILED`);
  console.log('================================================================================\n');

  if (fails > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Verification script crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
