import { prisma } from '../config/db.js';

async function auditDatabase() {
  console.log('==================== 1. USERS ====================');
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.table(users);

  console.log('\n==================== 2. SKILLS PER USER ====================');
  const skills = await prisma.skill.findMany({
    select: { id: true, userId: true, language: true, status: true, bestScore: true, claimedLevel: true, verifiedAt: true },
    orderBy: { userId: 'asc' },
  });
  console.table(skills);

  console.log('\n==================== 3. SUBMITTED ASSESSMENTS PER USER ====================');
  const assessments = await prisma.assessment.findMany({
    where: { status: 'SUBMITTED' },
    select: { id: true, userId: true, language: true, scorePercent: true, weightedPercent: true, level: true, submittedAt: true, tabSwitchCount: true },
    orderBy: { userId: 'asc' },
  });
  console.table(assessments);

  console.log('\n==================== 4. LEADERBOARD ENTRIES (GLOBAL, ALL) ====================');
  const leaderboard = await prisma.leaderboardEntry.findMany({
    where: { scope: 'GLOBAL', period: 'ALL' },
    select: { id: true, userId: true, points: true, rank: true, verifiedSkills: true },
    orderBy: { rank: 'asc' },
  });
  console.table(leaderboard);

  console.log('\n==================== 5. ANOMALY DETECTION ====================');
  // Check users who have leaderboard points WITHOUT matching VERIFIED skill or SUBMITTED assessment
  const anomalies = [];
  for (const entry of leaderboard) {
    const user = users.find(u => u.id === entry.userId);
    const userSkills = skills.filter(s => s.userId === entry.userId && s.status === 'VERIFIED');
    const userAssessments = assessments.filter(a => a.userId === entry.userId);

    const hasNoVerifiedSkills = userSkills.length === 0;
    const hasNoSubmittedAssessments = userAssessments.length === 0;

    if (hasNoVerifiedSkills || hasNoSubmittedAssessments) {
      anomalies.push({
        userId: entry.userId,
        username: user?.username,
        name: user?.name,
        points: entry.points,
        rank: entry.rank,
        verifiedSkillsCount: userSkills.length,
        submittedAssessmentsCount: userAssessments.length,
        reason: hasNoVerifiedSkills && hasNoSubmittedAssessments
          ? 'Has leaderboard entry but 0 VERIFIED skills and 0 SUBMITTED assessments'
          : hasNoVerifiedSkills
          ? 'Has leaderboard entry but 0 VERIFIED skills'
          : 'Has leaderboard entry but 0 SUBMITTED assessments',
      });
    }
  }

  console.log('Anomalies found:', anomalies.length);
  if (anomalies.length > 0) {
    console.table(anomalies);
  }

  console.log('\n==================== 6. ARJUN ACCOUNTS CHECK ====================');
  const arjunUsers = users.filter(u => 
    u.name.toLowerCase().includes('arjun') || 
    u.username.toLowerCase().includes('arjun') || 
    u.email.toLowerCase().includes('arjun')
  );
  console.log(`Found ${arjunUsers.length} Arjun accounts:`);
  console.table(arjunUsers);

  for (const arj of arjunUsers) {
    const arjSkills = skills.filter(s => s.userId === arj.id);
    const arjAssessments = assessments.filter(a => a.userId === arj.id);
    const arjLeaderboard = leaderboard.filter(l => l.userId === arj.id);
    console.log(`\nDetails for "${arj.name}" (@${arj.username}, ID: ${arj.id}):`);
    console.log('  Skills:', arjSkills.map(s => `${s.language} (${s.status}, score=${s.bestScore}, level=${s.claimedLevel})`));
    console.log('  Assessments:', arjAssessments.map(a => `${a.language} (${a.scorePercent}%, level=${a.level})`));
    console.log('  Leaderboard entries:', arjLeaderboard.map(l => `#${l.rank} (${l.points} pts)`));
  }

  console.log('\n==================== 7. DUPLICATE & NEAR-DUPLICATE USERNAMES / NAMES ====================');
  const duplicatePairs = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const u1 = users[i];
      const u2 = users[j];

      // Exact username
      const sameUsername = u1.username.toLowerCase() === u2.username.toLowerCase();

      // Near duplicate username (e.g. one contains other, or differing only by underscore/digits)
      const normU1 = u1.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normU2 = u2.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nearUsername = normU1 === normU2 || normU1.includes(normU2) || normU2.includes(normU1);

      // Name similarity
      const normName1 = u1.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normName2 = u2.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nearName = normName1 === normName2 || normName1.includes(normName2) || normName2.includes(normName1);

      if (sameUsername || nearUsername || nearName) {
        duplicatePairs.push({
          user1: `${u1.name} (@${u1.username})`,
          user2: `${u2.name} (@${u2.username})`,
          reason: sameUsername ? 'EXACT_USERNAME_MATCH' : nearUsername && nearName ? 'NEAR_USERNAME_AND_NAME' : nearUsername ? 'NEAR_USERNAME' : 'NEAR_NAME',
        });
      }
    }
  }

  console.log(`Found ${duplicatePairs.length} duplicate/near-duplicate pair(s):`);
  console.table(duplicatePairs);
}

auditDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
