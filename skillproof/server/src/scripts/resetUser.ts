import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ REFUSED: user:reset is a development-only script and cannot be run when NODE_ENV=production.');
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const [rawEmail, newPassword, requestedUsername] = args;

  if (!rawEmail || !newPassword) {
    console.error('Usage: npm run user:reset -- <email> <newPassword> [username]');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Error: newPassword must be at least 6 characters long.');
    process.exit(1);
  }

  const emailNormalized = rawEmail.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  // Find all rows matching case-insensitively and trimmed
  const allUsers = await prisma.user.findMany({
    include: { profile: true },
  });

  const matchingUsers = allUsers.filter(
    (u) => u.email.trim().toLowerCase() === emailNormalized
  );

  console.log(`🔍 Inspecting database for "${emailNormalized}"...`);
  console.log(`Found ${matchingUsers.length} matching user row(s).`);

  if (matchingUsers.length === 0) {
    console.error(`❌ No user found matching email: ${emailNormalized}`);
    process.exit(1);
  }

  if (matchingUsers.length > 1) {
    console.warn(`⚠️ Warning: Found ${matchingUsers.length} duplicate rows for ${emailNormalized}. Repairing primary row (${matchingUsers[0].id}).`);
  }

  const targetUser = matchingUsers[0];

  // Determine target username
  let finalUsername = targetUser.username ? targetUser.username.trim().toLowerCase() : '';
  const isCurrentUsernameValid = usernameRegex.test(finalUsername);

  const desiredFallback =
    requestedUsername?.trim().toLowerCase() ||
    (emailNormalized === 'sbalajiarjun@gmail.com' ? 'arjun_balaji_s_05' : 'arjun_balaji_s_05');

  if (requestedUsername || !isCurrentUsernameValid || emailNormalized === 'sbalajiarjun@gmail.com') {
    const conflict = await prisma.user.findFirst({
      where: {
        username: desiredFallback,
        id: { not: targetUser.id },
      },
    });

    if (!conflict && usernameRegex.test(desiredFallback)) {
      finalUsername = desiredFallback;
    } else if (!isCurrentUsernameValid) {
      const suffix = Math.floor(100 + Math.random() * 900);
      finalUsername = `user_${suffix}`;
    }
  }

  // Hash password exactly once with bcrypt cost 10
  const SALT_ROUNDS = 10;
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const verifyMatch = await bcrypt.compare(newPassword, passwordHash);

  if (!verifyMatch) {
    throw new Error('Failed internal bcrypt verification check after hashing.');
  }

  // Update User row
  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      email: emailNormalized,
      username: finalUsername,
      status: 'ACTIVE',
      passwordHash,
    },
    include: { profile: true },
  });

  // Ensure DeveloperProfile exists and publicSlug matches finalUsername
  let profile = updatedUser.profile;
  if (!profile) {
    profile = await prisma.developerProfile.create({
      data: {
        userId: updatedUser.id,
        bio: 'Software Engineer',
        publicSlug: finalUsername,
        isPublic: true,
        showOnLeaderboard: true,
      },
    });
    console.log('✅ Created missing DeveloperProfile.');
  } else if (profile.publicSlug !== finalUsername) {
    profile = await prisma.developerProfile.update({
      where: { id: profile.id },
      data: { publicSlug: finalUsername },
    });
    console.log(`✅ Synced DeveloperProfile.publicSlug to "${finalUsername}".`);
  }

  console.log('✅ Account repaired successfully:');
  console.log(
    JSON.stringify(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        status: updatedUser.status,
        isSuspended: updatedUser.status === 'SUSPENDED',
        createdAt: updatedUser.createdAt,
        passwordHashNonEmpty: Boolean(updatedUser.passwordHash && updatedUser.passwordHash.length > 0),
        passwordHashStartsWith$2: updatedUser.passwordHash.startsWith('$2'),
        bcryptCost10Verified: verifyMatch,
        profile: {
          id: profile.id,
          userId: profile.userId,
          publicSlug: profile.publicSlug,
          isPublic: profile.isPublic,
          showOnLeaderboard: profile.showOnLeaderboard,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error('❌ Error in user:reset:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

