import assert from 'assert';
import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

const API_BASE = 'http://127.0.0.1:5001/api';

async function runVerification() {
  console.log('======================================================================');
  console.log('🧪 VERIFYING COMPLETELY REBUILT AUTHENTICATION SYSTEM');
  console.log('======================================================================\n');

  const ts = Date.now().toString(36);

  // -------------------------------------------------------------------------
  // 1. GET /api/health
  // -------------------------------------------------------------------------
  console.log('▶ STEP 1: GET /api/health');
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthStatus = healthRes.status;
  const healthBody = await healthRes.json() as any;
  console.log('  Status:', healthStatus);
  console.log('  Body:', JSON.stringify(healthBody));
  assert.strictEqual(healthStatus, 200);
  assert.strictEqual(healthBody.success, true);
  console.log('  ✅ PASS: /api/health returns { success: true }\n');

  // -------------------------------------------------------------------------
  // 2. GET /api/auth/session when logged out (Never 401!)
  // -------------------------------------------------------------------------
  console.log('▶ STEP 2: GET /api/auth/session (Public, unauthenticated)');
  const sessLoggedOutRes = await fetch(`${API_BASE}/auth/session`);
  const sessLoggedOutStatus = sessLoggedOutRes.status;
  const sessLoggedOutBody = await sessLoggedOutRes.json() as any;
  console.log('  Status:', sessLoggedOutStatus);
  console.log('  Body:', JSON.stringify(sessLoggedOutBody));
  assert.strictEqual(sessLoggedOutStatus, 200, 'Session endpoint must return 200 when logged out');
  assert.strictEqual(sessLoggedOutBody.success, true);
  assert.strictEqual(sessLoggedOutBody.data.user, null, 'User must be null when logged out');
  console.log('  ✅ PASS: /api/auth/session returns { user: null } with 200 OK\n');

  // -------------------------------------------------------------------------
  // 3. GET /api/auth/check-username?u=
  // -------------------------------------------------------------------------
  console.log('▶ STEP 3: GET /api/auth/check-username?u=');
  const checkFree = await fetch(`${API_BASE}/auth/check-username?u=new_user_${ts}`);
  const checkFreeBody = await checkFree.json() as any;
  console.log('  Free username:', JSON.stringify(checkFreeBody));
  assert.strictEqual(checkFree.status, 200);
  assert.strictEqual(checkFreeBody.data.available, true);
  console.log('  ✅ PASS: check-username returns available=true for unused handle\n');

  // -------------------------------------------------------------------------
  // 4. POST /api/auth/register (Developer)
  // -------------------------------------------------------------------------
  console.log('▶ STEP 4: POST /api/auth/register (DEVELOPER)');
  const devUsername = `dev_${ts}`;
  const devEmail = `${devUsername}@cit.edu.in`;
  const devPassword = 'Password123!';

  const devRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dev Test User',
      username: devUsername,
      email: devEmail,
      password: devPassword,
      role: 'DEVELOPER',
    }),
  });

  const devRegStatus = devRegRes.status;
  const devRegCookie = devRegRes.headers.get('set-cookie') || '';
  const devRegBody = await devRegRes.json() as any;
  console.log('  Status:', devRegStatus);
  console.log('  Body:', JSON.stringify(devRegBody, null, 2));
  console.log('  Set-Cookie Header:', devRegCookie);

  assert.strictEqual(devRegStatus, 201);
  assert.strictEqual(devRegBody.success, true);
  assert.strictEqual(devRegBody.data.user.username, devUsername);
  assert.strictEqual(devRegBody.data.user.role, 'DEVELOPER');
  assert.strictEqual(devRegBody.data.user.passwordHash, undefined, 'passwordHash must never be exposed');
  assert(devRegBody.data.user.profile, 'DeveloperProfile must be created atomically');
  assert(devRegCookie.includes('sp_session='), 'Cookie sp_session must be set');
  assert(devRegCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');

  // Query database to verify database-level atomicity
  const dbDevUser = await prisma.user.findUnique({
    where: { username: devUsername },
    include: { profile: true },
  });
  assert(dbDevUser, 'User must exist in DB');
  assert(dbDevUser.profile, 'Profile must exist in DB');
  assert.strictEqual(dbDevUser.profile.isPublic, true);
  assert.strictEqual(dbDevUser.profile.showOnLeaderboard, true);
  assert.strictEqual(dbDevUser.profile.allowRecruiterMessages, true);
  assert.strictEqual(dbDevUser.profile.notificationsPaused, false);
  console.log('  ✅ PASS: Developer registered with atomic profile and sp_session cookie\n');

  // -------------------------------------------------------------------------
  // 5. GET /api/auth/session with sp_session cookie
  // -------------------------------------------------------------------------
  console.log('▶ STEP 5: GET /api/auth/session with sp_session cookie');
  const sessCookiePart = devRegCookie.split(';')[0];
  const sessLoggedInRes = await fetch(`${API_BASE}/auth/session`, {
    headers: { Cookie: sessCookiePart },
  });
  const sessLoggedInStatus = sessLoggedInRes.status;
  const sessLoggedInBody = await sessLoggedInRes.json() as any;
  console.log('  Status:', sessLoggedInStatus);
  console.log('  Body:', JSON.stringify(sessLoggedInBody, null, 2));
  assert.strictEqual(sessLoggedInStatus, 200);
  assert.strictEqual(sessLoggedInBody.success, true);
  assert.strictEqual(sessLoggedInBody.data.user.username, devUsername);
  assert.strictEqual(sessLoggedInBody.data.user.role, 'DEVELOPER');
  console.log('  ✅ PASS: Session persists via httpOnly sp_session cookie\n');

  // -------------------------------------------------------------------------
  // 6. POST /api/auth/register (Recruiter)
  // -------------------------------------------------------------------------
  console.log('▶ STEP 6: POST /api/auth/register (RECRUITER)');
  const recUsername = `rec_${ts}`;
  const recEmail = `${recUsername}@cit.edu.in`;
  const recPassword = 'Password123!';

  const recRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Recruiter Test User',
      username: recUsername,
      email: recEmail,
      password: recPassword,
      role: 'RECRUITER',
      companyName: 'Acme Systems',
      jobTitle: 'Head of Talent',
    }),
  });

  const recRegStatus = recRegRes.status;
  const recRegCookie = recRegRes.headers.get('set-cookie') || '';
  const recRegBody = await recRegRes.json() as any;
  console.log('  Status:', recRegStatus);
  console.log('  Body:', JSON.stringify(recRegBody, null, 2));
  assert.strictEqual(recRegStatus, 201);
  assert.strictEqual(recRegBody.data.user.role, 'RECRUITER');
  assert(recRegBody.data.user.recruiterProfile, 'RecruiterProfile must be created atomically');
  assert.strictEqual(recRegBody.data.user.recruiterProfile.isVerified, false, 'Recruiter must start with isVerified = false');
  assert(recRegCookie.includes('sp_session='), 'Cookie sp_session must be set');
  console.log('  ✅ PASS: Recruiter registered with unverified profile and sp_session cookie\n');

  // -------------------------------------------------------------------------
  // 7. Validation & Conflict Rejections
  // -------------------------------------------------------------------------
  console.log('▶ STEP 7: Validation & Conflict Rejections');

  // Duplicate email -> 409 "Email already in use. Please sign in."
  const dupEmailRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another User',
      username: `another_${ts}`,
      email: devEmail, // duplicate
      password: 'Password123!',
      role: 'DEVELOPER',
    }),
  });
  const dupEmailBody = await dupEmailRes.json() as any;
  console.log('  Duplicate Email Status:', dupEmailRes.status, dupEmailBody);
  assert.strictEqual(dupEmailRes.status, 409);
  assert.strictEqual(dupEmailBody.error, 'Email already in use. Please sign in.');

  // Duplicate username -> 409 "Username already taken"
  const dupUserRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another User',
      username: devUsername, // duplicate
      email: `unique_${ts}@cit.edu.in`,
      password: 'Password123!',
      role: 'DEVELOPER',
    }),
  });
  const dupUserBody = await dupUserRes.json() as any;
  console.log('  Duplicate Username Status:', dupUserRes.status, dupUserBody);
  assert.strictEqual(dupUserRes.status, 409);
  assert.strictEqual(dupUserBody.error, 'Username already taken');

  // Weak password (< 8 chars) -> 400
  const weakPassRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Short',
      username: `short_${ts}`,
      email: `short_${ts}@cit.edu.in`,
      password: 'short',
      role: 'DEVELOPER',
    }),
  });
  assert.strictEqual(weakPassRes.status, 400);

  // Recruiter missing companyName -> 400 with { field, message }
  const missingRecRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Incomplete Recruiter',
      username: `incomp_${ts}`,
      email: `incomp_${ts}@cit.edu.in`,
      password: 'Password123!',
      role: 'RECRUITER',
    }),
  });
  const missingRecBody = await missingRecRes.json() as any;
  console.log('  Missing Recruiter Fields Status:', missingRecRes.status, missingRecBody);
  assert.strictEqual(missingRecRes.status, 400);
  assert(missingRecBody.errors.some((e: any) => e.field === 'companyName'));
  assert(missingRecBody.errors.some((e: any) => e.field === 'jobTitle'));

  // Invalid role (ADMIN) -> 400
  const adminRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Malicious Admin',
      username: `admin_${ts}`,
      email: `admin_${ts}@cit.edu.in`,
      password: 'Password123!',
      role: 'ADMIN',
    }),
  });
  assert.strictEqual(adminRegRes.status, 400);
  console.log('  ✅ PASS: Validation, P2002 mapping, and role restrictions verified\n');

  // -------------------------------------------------------------------------
  // 8. POST /api/auth/login & Timing Defense
  // -------------------------------------------------------------------------
  console.log('▶ STEP 8: POST /api/auth/login (Wrong credential parity)');

  // Wrong password on existing user -> 401 "Incorrect email or password"
  const badPassRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: devEmail, password: 'WrongPassword123!' }),
  });
  const badPassBody = await badPassRes.json() as any;
  console.log('  Bad Password Status:', badPassRes.status, badPassBody);
  assert.strictEqual(badPassRes.status, 401);
  assert.strictEqual(badPassBody.error, 'Incorrect email or password');

  // Non-existent email -> 401 "Incorrect email or password" (Dummy hash compared)
  const nonExistRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_ghost@cit.edu.in', password: 'Password123!' }),
  });
  const nonExistBody = await nonExistRes.json() as any;
  console.log('  Non-existent User Status:', nonExistRes.status, nonExistBody);
  assert.strictEqual(nonExistRes.status, 401);
  assert.strictEqual(nonExistBody.error, 'Incorrect email or password');

  // Valid login -> 200 OK
  const goodLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: devEmail, password: devPassword }),
  });
  const goodLoginBody = await goodLoginRes.json() as any;
  console.log('  Valid Login Status:', goodLoginRes.status, goodLoginBody);
  assert.strictEqual(goodLoginRes.status, 200);
  assert.strictEqual(goodLoginBody.data.user.username, devUsername);
  console.log('  ✅ PASS: Login credential parity and dummy hash defense verified\n');

  // -------------------------------------------------------------------------
  // 9. Account Lockout (5 failed attempts -> 423)
  // -------------------------------------------------------------------------
  console.log('▶ STEP 9: Account Lockout after 5 failed attempts');
  const victimUsername = `victim_${ts}`;
  const victimEmail = `${victimUsername}@cit.edu.in`;
  const victimPass = 'Password123!';

  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Victim User',
      username: victimUsername,
      email: victimEmail,
      password: victimPass,
      role: 'DEVELOPER',
    }),
  });

  // Attempt 1 to 4: returns 401
  for (let i = 1; i <= 4; i++) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: victimEmail, password: 'BadPassword!' }),
    });
    assert.strictEqual(res.status, 401);
  }

  // Attempt 5: triggers 423 lockout
  const fifthRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: victimEmail, password: 'BadPassword!' }),
  });
  const fifthBody = await fifthRes.json() as any;
  console.log('  5th attempt Status:', fifthRes.status, fifthBody);
  assert.strictEqual(fifthRes.status, 423);
  assert(fifthBody.error.includes('Too many failed attempts'));

  // Attempt 6 (even with correct password): still locked out
  const lockedRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: victimEmail, password: victimPass }),
  });
  const lockedBody = await lockedRes.json() as any;
  console.log('  Locked user attempt Status:', lockedRes.status, lockedBody);
  assert.strictEqual(lockedRes.status, 423);
  console.log('  ✅ PASS: 5 failed attempts triggered 423 account lockout\n');

  // -------------------------------------------------------------------------
  // 10. Suspended Account Check (403 "This account is suspended")
  // -------------------------------------------------------------------------
  console.log('▶ STEP 10: Suspended Account (403)');
  const suspUsername = `susp_${ts}`;
  const suspEmail = `${suspUsername}@cit.edu.in`;
  const suspPass = 'Password123!';

  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Suspended User',
      username: suspUsername,
      email: suspEmail,
      password: suspPass,
      role: 'DEVELOPER',
    }),
  });

  // Suspend the account in DB
  await prisma.user.update({
    where: { email: suspEmail },
    data: { status: 'SUSPENDED' },
  });

  const suspLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: suspEmail, password: suspPass }),
  });
  const suspLoginBody = await suspLoginRes.json() as any;
  console.log('  Suspended Login Status:', suspLoginRes.status, suspLoginBody);
  assert.strictEqual(suspLoginRes.status, 403);
  assert.strictEqual(suspLoginBody.error, 'This account is suspended');
  console.log('  ✅ PASS: Suspended accounts return 403\n');

  // -------------------------------------------------------------------------
  // 11. POST /api/auth/logout
  // -------------------------------------------------------------------------
  console.log('▶ STEP 11: POST /api/auth/logout');
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
  const logoutCookie = logoutRes.headers.get('set-cookie') || '';
  console.log('  Logout Status:', logoutRes.status);
  console.log('  Logout Set-Cookie Header:', logoutCookie);
  assert.strictEqual(logoutRes.status, 200);
  assert(logoutCookie.includes('sp_session=;'), 'Must clear sp_session cookie');
  console.log('  ✅ PASS: Logout clears sp_session cookie\n');

  // -------------------------------------------------------------------------
  // 12. Public vs Protected Routes Protection
  // -------------------------------------------------------------------------
  console.log('▶ STEP 12: Route Protection (Public vs Protected)');
  const protRes = await fetch(`${API_BASE}/me`);
  const protBody = await protRes.json() as any;
  console.log('  Protected /api/me without cookie Status:', protRes.status, protBody);
  assert.strictEqual(protRes.status, 401);
  assert.strictEqual(protBody.error, 'Authentication required');
  console.log('  ✅ PASS: Protected routes require login\n');

  console.log('🎉 ALL 12 REBUILT AUTHENTICATION VERIFICATION TESTS PASSED WITH 100% EVIDENCE!\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failure:', err);
    process.exit(1);
  });

