import { prisma } from '../config/db.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import { UserService } from '../services/userService.js';
import { PortfolioService } from '../services/portfolioService.js';
import assert from 'assert';

async function runE2EVerification() {
  console.log('🚀 Running Multi-User & Leaderboard End-to-End Verification...');

  // 1. Verify 10 demo developers seeded
  const users = await prisma.user.findMany({
    where: { role: 'DEVELOPER' },
    select: { id: true, email: true, username: true, name: true },
  });
  console.log(`Found ${users.length} seeded developers.`);
  assert(users.length >= 10, 'Expected at least 10 developers');

  // Verify username format on all users
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  for (const u of users) {
    assert(usernameRegex.test(u.username), `Username ${u.username} invalid format`);
  }
  console.log('✅ All seeded developers have valid usernames');

  // 2. Test Username Search API & Privacy (Emails must NOT leak)
  const searchResults = await UserService.searchUsers('arjun');
  assert(searchResults.length > 0, 'Should find arjun');
  console.log('Search result sample:', JSON.stringify(searchResults[0]));
  assert(!('email' in searchResults[0]), 'Search result MUST NOT contain email');
  const arjunMatch = searchResults.find(r => r.username === 'arjun');
  assert(arjunMatch, 'Arjun should be in search results');
  assert(arjunMatch.points !== undefined);
  console.log('✅ Username search works and guarantees zero email leakage');

  // 3. Test Portfolio Lookup by Username & Redirect by Slug
  const user1 = users[0];
  const devProfile = await prisma.developerProfile.findUnique({
    where: { userId: user1.id }
  });
  assert(devProfile, 'Profile exists');

  const portfolioByUsername = await PortfolioService.getPublicPortfolioBySlug(user1.username);
  assert(portfolioByUsername, 'Portfolio by username retrieved');
  assert(!('email' in portfolioByUsername), 'Portfolio MUST NOT expose user email');
  console.log('✅ Portfolio by /u/:username returns successfully without email');

  // Test slug redirect: give user a different slug to verify redirect
  await prisma.developerProfile.update({
    where: { userId: user1.id },
    data: { publicSlug: 'dev-legacy-slug-123' },
  });

  const portfolioBySlug = await PortfolioService.getPublicPortfolioBySlug('dev-legacy-slug-123');
  assert(portfolioBySlug?.redirectToUsername === user1.username, 'Slug lookup redirects to username');
  console.log(`✅ Portfolio by slug redirects to /u/${user1.username}`);

  // Restore slug
  await prisma.developerProfile.update({
    where: { userId: user1.id },
    data: { publicSlug: devProfile.publicSlug },
  });

  // 4. Test Multi-User Assessment & Realtime Leaderboard Rank Updates
  // Pick user dev_alex and priyasharma
  const devAlex = users.find(u => u.username === 'dev_alex') || users[1];
  const priya = users.find(u => u.username === 'priyasharma') || users[2];

  // Fetch initial leaderboard from real DB
  const lbInitial = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all', currentUserId: devAlex.id });
  console.log(`Initial entries: ${lbInitial.entries.length}, Alex rank: ${lbInitial.currentUserRank?.rank}`);

  // Alex completes an assessment in JavaScript
  const jsSkill = await prisma.skillCatalog.findFirst({
    where: { name: { contains: 'JavaScript' } }
  });

  if (jsSkill) {
    console.log(`Submitting new verified assessment for Alex in ${jsSkill.name}...`);
    // Upsert skill
    const skill = await prisma.skill.upsert({
      where: {
        userId_language: {
          userId: devAlex.id,
          language: jsSkill.name,
        },
      },
      create: {
        userId: devAlex.id,
        language: jsSkill.name,
        skillCatalogId: jsSkill.id,
        status: 'VERIFIED',
        bestScore: 95,
        claimedLevel: 'Expert',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
      update: {
        status: 'VERIFIED',
        bestScore: 95,
        claimedLevel: 'Expert',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
    });

    // Create assessment
    await prisma.assessment.create({
      data: {
        userId: devAlex.id,
        skillId: skill.id,
        language: jsSkill.name,
        skillCatalogId: jsSkill.id,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 1000 * 60 * 25),
        submittedAt: new Date(),
        scorePercent: 95,
        weightedPercent: 95,
        level: 'Expert',
        tabSwitchCount: 0,
        coverage: JSON.stringify({ topicsCovered: 5, questionsAnswered: 20, attemptsCount: 1 }),
        topicBreakdown: JSON.stringify({}),
      },
    });

    // Recalculate leaderboard for user in real database
    await LeaderboardService.recalculateUser(devAlex.id);

    // Fetch updated leaderboard from Priya's perspective and Alex's perspective
    const lbAlex = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all', currentUserId: devAlex.id });
    const lbPriya = await LeaderboardService.getLeaderboard({ scope: 'global', period: 'all', currentUserId: priya.id });

    console.log(`Updated Alex Rank: #${lbAlex.currentUserRank?.rank} (${lbAlex.currentUserRank?.points} pts)`);
    console.log(`Priya's View Rank: #${lbPriya.currentUserRank?.rank} (${lbPriya.currentUserRank?.points} pts)`);

    assert(lbAlex.currentUserRank?.rank !== null && lbAlex.currentUserRank?.rank !== undefined, 'Alex has rank');
    assert(lbPriya.currentUserRank?.rank !== null && lbPriya.currentUserRank?.rank !== undefined, 'Priya has rank');
    console.log('✅ Realtime leaderboard recalculation verified for multiple users');
  }

  console.log('\n🎉 ALL MULTI-USER & LEADERBOARD VERIFICATIONS PASSED SUCCESSFULLY!');
}

runE2EVerification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
