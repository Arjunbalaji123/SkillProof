import assert from 'assert';

const API_BASE = 'http://127.0.0.1:5001/api';

async function runVerification() {
  console.log('🧪 Starting SkillProof Comprehensive Registration Flow Verification...\n');
  const ts = Date.now().toString(36);

  // =========================================================================
  // TEST 1: Register a Developer
  // =========================================================================
  console.log('▶ TEST 1: Register a Developer with valid data');
  const devUsername = `dev_robust_${ts}`;
  const devEmail = `${devUsername}@test.skillproof.dev`;
  const devPassword = 'Password123!';

  const devRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Alice Developer',
      username: devUsername,
      email: devEmail,
      password: devPassword,
      role: 'DEVELOPER',
    }),
  });

  const devRegStatus = devRegRes.status;
  const devRegCookie = devRegRes.headers.get('set-cookie') || '';
  const devRegBody: any = await devRegRes.json();
  console.log('  Status:', devRegStatus);
  console.log('  Response:', JSON.stringify(devRegBody, null, 2));
  assert.strictEqual(devRegStatus, 201, 'Developer register must return 201 Created');
  assert.strictEqual(devRegBody.success, true);
  assert.strictEqual(devRegBody.data.user.username, devUsername);
  assert.strictEqual(devRegBody.data.user.role, 'DEVELOPER');
  assert(devRegBody.data.user.profile, 'DeveloperProfile must be created in transaction');
  assert(devRegCookie.includes('token='), 'Cookie token must be set');
  console.log('  ✅ Developer registration verified.\n');

  // =========================================================================
  // TEST 2: Log Out
  // =========================================================================
  console.log('▶ TEST 2: Log Out the registered developer');
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: devRegCookie.split(';')[0] },
  });
  const logoutStatus = logoutRes.status;
  const logoutBody: any = await logoutRes.json();
  console.log('  Status:', logoutStatus);
  console.log('  Response:', JSON.stringify(logoutBody, null, 2));
  assert.strictEqual(logoutStatus, 200, 'Logout must return 200 OK');
  console.log('  ✅ Developer logout verified.\n');

  // =========================================================================
  // TEST 3: Log In with Credentials
  // =========================================================================
  console.log('▶ TEST 3: Log In with credentials');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: devEmail, password: devPassword }),
  });
  const loginStatus = loginRes.status;
  const loginCookie = loginRes.headers.get('set-cookie') || '';
  const loginBody: any = await loginRes.json();
  console.log('  Status:', loginStatus);
  console.log('  Response:', JSON.stringify(loginBody, null, 2));
  assert.strictEqual(loginStatus, 200, 'Login must return 200 OK');
  assert.strictEqual(loginBody.success, true);
  assert.strictEqual(loginBody.data.user.username, devUsername);
  assert(loginCookie.includes('token='), 'Login cookie token must be returned');
  console.log('  ✅ Developer login verified.\n');

  // =========================================================================
  // TEST 4: Session Refresh (stays logged in)
  // =========================================================================
  console.log('▶ TEST 4: Refresh session via GET /api/auth/session (cookie persistence)');
  const sessionRes = await fetch(`${API_BASE}/auth/session`, {
    headers: { Cookie: loginCookie.split(';')[0] },
  });
  const sessionStatus = sessionRes.status;
  const sessionBody: any = await sessionRes.json();
  console.log('  Status:', sessionStatus);
  console.log('  Response:', JSON.stringify(sessionBody, null, 2));
  assert.strictEqual(sessionStatus, 200, 'Session check must return 200 OK');
  assert.strictEqual(sessionBody.success, true);
  assert.strictEqual(sessionBody.data.username, devUsername);
  console.log('  ✅ Session persistence verified.\n');

  // =========================================================================
  // TEST 5: Register a Recruiter with companyName and jobTitle
  // =========================================================================
  console.log('▶ TEST 5: Register a Recruiter with valid organization data');
  const recUsername = `rec_robust_${ts}`;
  const recEmail = `${recUsername}@test.skillproof.dev`;
  const recPassword = 'Password123!';

  const recRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Robert Recruiter',
      username: recUsername,
      email: recEmail,
      password: recPassword,
      role: 'RECRUITER',
      companyName: 'Apex Cloud Ventures',
      jobTitle: 'Senior Tech Recruiter',
      companyWebsite: 'https://apexcloud.example.com',
    }),
  });

  const recRegStatus = recRegRes.status;
  const recRegBody: any = await recRegRes.json();
  console.log('  Status:', recRegStatus);
  console.log('  Response:', JSON.stringify(recRegBody, null, 2));
  assert.strictEqual(recRegStatus, 201, 'Recruiter register must return 201 Created');
  assert.strictEqual(recRegBody.success, true);
  assert.strictEqual(recRegBody.message, 'Registration successful. Your recruiter account is pending approval.');
  assert.strictEqual(recRegBody.data.user.username, recUsername);
  assert.strictEqual(recRegBody.data.user.role, 'RECRUITER');
  assert(recRegBody.data.user.recruiterProfile, 'RecruiterProfile must be created in transaction');
  assert.strictEqual(recRegBody.data.user.recruiterProfile.isVerified, false, 'Recruiter must start unverified');
  console.log('  ✅ Recruiter registration & pending approval verified.\n');

  // =========================================================================
  // TEST 6: Duplicate Email Attempt
  // =========================================================================
  console.log('▶ TEST 6: Duplicate Email attempt');
  const dupEmailRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Another Developer',
      username: `another_${ts}`,
      email: devEmail, // duplicate
      password: 'Password123!',
      role: 'DEVELOPER',
    }),
  });
  const dupEmailStatus = dupEmailRes.status;
  const dupEmailBody: any = await dupEmailRes.json();
  console.log('  Status:', dupEmailStatus);
  console.log('  Response:', JSON.stringify(dupEmailBody, null, 2));
  assert.strictEqual(dupEmailStatus, 409, 'Duplicate email must return 409 Conflict');
  assert.strictEqual(dupEmailBody.message, 'Email already in use. Please sign in.');
  console.log('  ✅ Duplicate email rejection verified.\n');

  // =========================================================================
  // TEST 7: Duplicate Username Attempt
  // =========================================================================
  console.log('▶ TEST 7: Duplicate Username attempt');
  const dupUserRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Another Developer',
      username: devUsername, // duplicate
      email: `different_${ts}@test.skillproof.dev`,
      password: 'Password123!',
      role: 'DEVELOPER',
    }),
  });
  const dupUserStatus = dupUserRes.status;
  const dupUserBody: any = await dupUserRes.json();
  console.log('  Status:', dupUserStatus);
  console.log('  Response:', JSON.stringify(dupUserBody, null, 2));
  assert.strictEqual(dupUserStatus, 409, 'Duplicate username must return 409 Conflict');
  assert.strictEqual(dupUserBody.message, 'Username already taken');
  console.log('  ✅ Duplicate username rejection verified.\n');

  // =========================================================================
  // TEST 8: Weak Password Attempt (< 8 characters)
  // =========================================================================
  console.log('▶ TEST 8: Weak Password attempt (< 8 characters)');
  const weakPassRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Charlie Tester',
      username: `charlie_${ts}`,
      email: `charlie_${ts}@test.skillproof.dev`,
      password: 'short', // 5 chars
      role: 'DEVELOPER',
    }),
  });
  const weakPassStatus = weakPassRes.status;
  const weakPassBody: any = await weakPassRes.json();
  console.log('  Status:', weakPassStatus);
  console.log('  Response:', JSON.stringify(weakPassBody, null, 2));
  assert.strictEqual(weakPassStatus, 400, 'Weak password must return 400 Bad Request');
  assert(
    weakPassBody.errors?.some((e: any) => e.message.includes('Password must be at least 8 characters')),
    'Must include field-level error for password'
  );
  console.log('  ✅ Weak password rejection verified.\n');

  // =========================================================================
  // TEST 9: Invalid Username Format Attempt
  // =========================================================================
  console.log('▶ TEST 9: Invalid Username format attempt');
  const invUserRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Invalid User',
      username: 'Invalid-User!@#', // bad characters
      email: `inv_${ts}@test.skillproof.dev`,
      password: 'Password123!',
      role: 'DEVELOPER',
    }),
  });
  const invUserStatus = invUserRes.status;
  const invUserBody: any = await invUserRes.json();
  console.log('  Status:', invUserStatus);
  console.log('  Response:', JSON.stringify(invUserBody, null, 2));
  assert.strictEqual(invUserStatus, 400, 'Invalid username must return 400 Bad Request');
  assert(
    invUserBody.errors?.some((e: any) => e.field.includes('username')),
    'Must include field-level error for username'
  );
  console.log('  ✅ Invalid username rejection verified.\n');

  // =========================================================================
  // TEST 10: Recruiter Missing Organization Fields
  // =========================================================================
  console.log('▶ TEST 10: Recruiter missing companyName and jobTitle');
  const badRecRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Incomplete Recruiter',
      username: `incomp_rec_${ts}`,
      email: `incomp_${ts}@test.skillproof.dev`,
      password: 'Password123!',
      role: 'RECRUITER',
      // companyName and jobTitle missing
    }),
  });
  const badRecStatus = badRecRes.status;
  const badRecBody: any = await badRecRes.json();
  console.log('  Status:', badRecStatus);
  console.log('  Response:', JSON.stringify(badRecBody, null, 2));
  assert.strictEqual(badRecStatus, 400, 'Missing recruiter fields must return 400 Bad Request');
  assert(
    badRecBody.errors?.some((e: any) => e.field === 'companyName'),
    'Must have companyName field error'
  );
  assert(
    badRecBody.errors?.some((e: any) => e.field === 'jobTitle'),
    'Must have jobTitle field error'
  );
  console.log('  ✅ Recruiter missing fields rejection verified.\n');

  // =========================================================================
  // TEST 11: Log in repaired account 2403717672621008@cit.edu.in
  // =========================================================================
  console.log('▶ TEST 11: Log in repaired account 2403717672621008@cit.edu.in');
  const citLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '2403717672621008@cit.edu.in',
      password: 'Cit@12345678',
    }),
  });
  const citLoginStatus = citLoginRes.status;
  const citLoginBody: any = await citLoginRes.json();
  const citCookie = citLoginRes.headers.get('set-cookie') || '';
  console.log('  Status:', citLoginStatus);
  console.log('  Response:', JSON.stringify(citLoginBody, null, 2));
  assert.strictEqual(citLoginStatus, 200, 'Repaired account login must return 200 OK');
  assert.strictEqual(citLoginBody.success, true);
  assert.strictEqual(citLoginBody.data.user.username, 'arjun_balaji');
  assert.strictEqual(citLoginBody.data.user.role, 'DEVELOPER');
  assert.strictEqual(citLoginBody.data.user.email, undefined, 'User email must not be leaked in API response');
  assert(citLoginBody.data.token || citCookie.includes('token='), 'Must receive valid token');
  console.log('  ✅ Repaired account login verified.\n');

  // =========================================================================
  // TEST 12: Bad Password returns 401 "Incorrect email or password"
  // =========================================================================
  console.log('▶ TEST 12: Bad password returns 401 "Incorrect email or password"');
  const badPassRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '2403717672621008@cit.edu.in',
      password: 'WrongPassword123!',
    }),
  });
  const badPassStatus = badPassRes.status;
  const badPassBody: any = await badPassRes.json();
  console.log('  Status:', badPassStatus);
  console.log('  Response:', JSON.stringify(badPassBody, null, 2));
  assert.strictEqual(badPassStatus, 401, 'Bad password must return 401 Unauthorized');
  assert.strictEqual(badPassBody.message, 'Incorrect email or password');
  console.log('  ✅ Bad password rejection verified.\n');

  // =========================================================================
  // TEST 13: Non-existent user returns 401 "Incorrect email or password"
  // =========================================================================
  console.log('▶ TEST 13: Non-existent user returns 401 "Incorrect email or password"');
  const nonExistentRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent_account_xyz@test.com',
      password: 'SomePassword123!',
    }),
  });
  const nonExistentStatus = nonExistentRes.status;
  const nonExistentBody: any = await nonExistentRes.json();
  console.log('  Status:', nonExistentStatus);
  console.log('  Response:', JSON.stringify(nonExistentBody, null, 2));
  assert.strictEqual(nonExistentStatus, 401, 'Non-existent user must return 401 Unauthorized');
  assert.strictEqual(nonExistentBody.message, 'Incorrect email or password');
  console.log('  ✅ Non-existent user rejection verified.\n');

  // =========================================================================
  // TEST 14: Username availability check
  // =========================================================================
  console.log('▶ TEST 14: Username availability check endpoint');
  const takenUserCheck = await fetch(`${API_BASE}/users/check-username?u=arjun_balaji`);
  const takenBody: any = await takenUserCheck.json();
  console.log('  Taken username response:', JSON.stringify(takenBody, null, 2));
  assert.strictEqual(takenBody.data.available, false, 'Existing username must report available=false');

  const freeUserCheck = await fetch(`${API_BASE}/users/check-username?u=available_${ts}`);
  const freeBody: any = await freeUserCheck.json();
  console.log('  Free username response:', JSON.stringify(freeBody, null, 2));
  assert.strictEqual(freeBody.data.available, true, 'Unused username must report available=true');
  console.log('  ✅ Username availability check verified.\n');

  console.log('🎉 ALL 14 AUTH & REGISTRATION VERIFICATION TESTS PASSED WITH 100% EVIDENCE!\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
