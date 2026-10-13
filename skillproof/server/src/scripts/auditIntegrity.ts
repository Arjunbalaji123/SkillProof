import { prisma } from '../config/db.js';

async function checkOrphansAndDuplicates() {
  console.log('--- AUDITING DATABASE INTEGRITY ---');

  // 1. Users without expected profile
  const devUsersWithoutProfile = await prisma.user.findMany({
    where: { role: 'DEVELOPER', profile: null },
    select: { id: true, email: true, username: true, role: true, isDemo: true, createdAt: true },
  });

  const recUsersWithoutProfile = await prisma.user.findMany({
    where: { role: 'RECRUITER', recruiterProfile: null },
    select: { id: true, email: true, username: true, role: true, isDemo: true, createdAt: true },
  });

  // 2. DeveloperProfiles without user
  const allDevProfiles = await prisma.developerProfile.findMany({
    include: { user: true },
  });
  const orphanedDevProfiles = allDevProfiles.filter((p) => !p.user);

  // 3. RecruiterProfiles without user
  const allRecProfiles = await prisma.recruiterProfile.findMany({
    include: { user: true },
  });
  const orphanedRecProfiles = allRecProfiles.filter((p) => !p.user);

  // 4. Duplicate or null usernames
  const rawNullOrEmptyUsers: any = await prisma.$queryRaw`
    SELECT id, email, username, role, isDemo FROM User WHERE username IS NULL OR username = '';
  `;

  const allUsers = await prisma.user.findMany({ select: { username: true } });
  const usernameCounts: Record<string, number> = {};
  for (const u of allUsers) {
    if (u.username) {
      usernameCounts[u.username] = (usernameCounts[u.username] || 0) + 1;
    }
  }
  const duplicateUsernames = Object.entries(usernameCounts).filter(([_, count]) => count > 1);

  console.log('Developers without DeveloperProfile:', JSON.stringify(devUsersWithoutProfile, null, 2));
  console.log('Recruiters without RecruiterProfile:', JSON.stringify(recUsersWithoutProfile, null, 2));
  console.log('Orphaned DeveloperProfiles count:', orphanedDevProfiles.length);
  console.log('Orphaned RecruiterProfiles count:', orphanedRecProfiles.length);
  console.log('Users with null/empty username count:', rawNullOrEmptyUsers.length, rawNullOrEmptyUsers);
  console.log('Duplicate usernames:', duplicateUsernames);

  process.exit(0);
}

checkOrphansAndDuplicates().catch((err) => {
  console.error(err);
  process.exit(1);
});
