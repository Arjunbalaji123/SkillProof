import { prisma } from '../config/db.js';

export function sanitizeUsername(raw: string): string {
  // Replace any non-alphanumeric/non-underscore with underscore
  let clean = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  // Collapse multiple underscores
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (clean.length < 3) {
    clean = (clean + '_dev').slice(0, 20);
    if (clean.length < 3) clean = 'user_' + Math.floor(100 + Math.random() * 900);
  }
  return clean.slice(0, 20);
}

export async function migrateExistingUsernames() {
  console.log('🔄 Running migration: Generating unique usernames for existing users...');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { profile: true },
  });

  const takenUsernames = new Set<string>();

  // Collect already assigned usernames
  for (const user of users) {
    if (user.username) {
      takenUsernames.add(user.username.toLowerCase());
    }
  }

  let updatedCount = 0;
  for (const user of users) {
    if (!user.username) {
      let base = sanitizeUsername(user.profile?.publicSlug || user.name || user.email.split('@')[0]);
      let candidate = base;
      let suffix = 1;

      while (takenUsernames.has(candidate)) {
        const suffixStr = String(suffix);
        candidate = (base.slice(0, 20 - suffixStr.length) + suffixStr).toLowerCase();
        suffix++;
      }

      takenUsernames.add(candidate);
      await prisma.user.update({
        where: { id: user.id },
        data: { username: candidate },
      });
      console.log(`  👤 Assigned username: "${candidate}" to ${user.name} (${user.email})`);
      updatedCount++;
    }

    // Ensure profile has showOnLeaderboard set
    if (user.profile && (user.profile.showOnLeaderboard === null || user.profile.showOnLeaderboard === undefined)) {
      await prisma.developerProfile.update({
        where: { id: user.profile.id },
        data: { showOnLeaderboard: true },
      });
    }
  }

  console.log(`✅ Migration complete: Updated ${updatedCount} users with unique usernames.`);
}

if (process.argv[1]?.includes('migrateUsernames')) {
  migrateExistingUsernames()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

